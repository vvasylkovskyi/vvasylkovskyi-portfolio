# Deep Prompt Engineer - Learning Best Prompt

Prompt Engineering is a practice of improving natural language instructions for the LLM, where the goal is for LLM to perform "better". The traditional approach to prompt engineering is "vibe" prompting, where an engineer adjusts prompt using their best judgement.

The definition of "better" prompt is a complex problem because the breadth of possible questions given the scope of the agent is hard to cover. As a result, the "better" prompt must be measured with some real data.

What we have been doing is measuring them with the dataset. If the new prompt scores more examples in the dataset as correct, then this prompt is indeed better. Still the process of adjusting prompt is manual, and although grounded on the dataset, the process of improving prompt is still by the "vibe". The choice of best prompt is a statistical problem since small variations in the language can produce big spectrum of improvement or degradation.

This document proposes a novel approach to prompt engineering, coined as deep prompt learning. The idea is to reuse the intuition of deep learning of the AI model, where instead of training the AI model, we will train the AI to craft the best prompt. Given the dataset, we can extract the loss function, and iteratively train the AI to improve the previous prompt until such improvement is no longer possible. This is essentially a supervised learning over instructions.

The result aim to demonstrate that making AI produce best prompt is far more reliable than vibe prompting, and is faster, hence providing better confidence in what is "best" prompt and freeing development times on other higher-order tasks.

## Similar Approaches

Similar approaches have been done in the recent past. The [https://huggingface.co/blog/dleemiller/auto-prompt-opt-dspy-cross-encoders](Automatic Prompt Optimization with DSPy and Cross Encoders) uses similar approach where Bayesian Search is used while iterating over and over until best performance is achieved. [https://www.autoprompt.cc/](AutoPrompt) is an online service that turns your goals into prompt.

## Core Design of Learning Model

Using The prompt optimization as a learning problem, not manual iteration. The high-level steps are as follow:

- Inputs: dataset of (question → desired behavior / expected output)
- Objective: find a prompt that maximizes performance across the dataset
- Loop: model generates → evaluate → improve prompt

```
Dataset
  ↓
Prompt Generator (LLM)
  ↓
Candidate Prompt
  ↓
Run on Dataset
  ↓
Evaluator (LLM / rules / metrics)
  ↓
Score + Failure Analysis
  ↓
Prompt Generator (with feedback)
```

### Improving Existing Prompt vs Generating a new prompt from scratch

We are going to being with improving an existing prompt for our experiment. However either option could be valid.

### How is this different from fine-tunning

| Prompt Optimization | Fine-tuning    |
| ------------------- | -------------- |
| Fast iteration      | Slow           |
| Cheap               | Expensive      |
| Model-agnostic      | Model-specific |
| Interpretable       | Opaque         |

### Core Components

```
┌───────────┐
│ Dataset   │  (inputs + expected behavior / rubric)
└─────┬─────┘
      │
┌─────▼─────┐
│ Prompt    │  (current best prompt)
│ Store     │
└─────┬─────┘
      │
┌─────▼─────┐
│ Executor  │  (runs prompt on dataset)
└─────┬─────┘
      │ outputs
┌─────▼─────┐
│ Evaluator │  (scores + failure cases)
└─────┬─────┘
      │ feedback
┌─────▼─────┐
│ Prompt    │  (LLM-based optimizer)
│ Optimizer │
└─────┬─────┘
      │ new prompt
┌─────▼─────┐
│ Selector  │  (accept / reject / version)
└───────────┘

```

### Design in detail

Given the about core components, the goal is to build a learning algorithm that will iterate on itself. Each iteration will use the same dataset, same model, and same deterministic settings as much as possible.

The dataset is iterated. For each dataset item:

```sh
LLM(system_prompt + input) → output
```

So the overall pseudo-code can look like follows:

```python
prompt = load_best_prompt()
dataset = load_labeled_dataset()

training_set, validation_set = split_dataset()
best_val_loss = float("inf")

for iteration in range(K):
  training_loss, training_traces = evaluate(prompt, training_set)
  failure_summary = cluster_failures(training_traces)

  candidate_prompt = optimize_prompt(prompt, failure_summary)

  validation_loss, _ = evaluate(candidate_prompt, validation_set)

  if val_loss < best_val_loss:
    prompt = candidate_prompt
    best_val_loss = val_loss
```

#### Split of the dataset

It is essential to split dataset into validation and training set to prevent the overfitting problem. The overfit happens when AI has been trained on large dataset too well, such that it performs poorly outside the dataset. In other words it is not generalist enough.

We have established that split of the dataset is essential. So how to split dataset correctly? One of the approaches is to do it randomly, but it might hide the overfitting for obvious reasons. We can do better, split by intent or pattern. Essentially the guideline for validation dataset is:

- Should contain unseen examples
- Edge cases
- rare confusions

The confusion pairs here refer to things like wrong classifications. For example: Choosing tool in AI agent - SRE agent instead of Insights agent are similar confusion between itself. The Shift Agent instead of Insights Agent is another confusion pair. Within the confusion group there might be different reasons for failure.

For our demonstration we will split dataset as follows:

- 70% training
- 30% validation

Both stratified by correct_tool and intent tag.

#### Evaluation Function

Evaluation function will run the "regression tests" over the dataset (training and validation). The goal of the evaluation function is to compute the loss, where the higher loss means more tests failed, hence the prompt is less good. Also, as a driver of improvement, each failed example is explained and tagged, which is essential to feed into AI to drive the improvement. An example of evaluation function in pseudo-code is as below:

```python
def evaluate(prompt, dataset):
    total_loss = 0
    traces = []

    for example in dataset:

        predicted_tool, explanation = run_llm(prompt, example.input)

        if predicted_tool != example.correct_tool:
            total_loss += 1
            traces.push({ predicted_tool, example.correct_tool, explanation })

    average_loss = total_loss / number_of_examples

    return average_loss, traces
```

#### The Run LLM on Dataset

The `run_llm` function is our LLM. Essentially we want it to do two things:

- Predict the right tool
- Explain the reasoning

#### How to cluster failures

Clustering of errors is essentially a practice of converting the information as follows:

- From: Here are 37 failed examples
- To: Here is the kind of reason for this wrong tool choice

###### Baseline clustering - confusion pairs

What we can do as the starting point is clustering by confusion pair:

```sh
(predicted_tool → correct_tool)
```

For example:

```sh
sre_agent → rag_agent (18 cases)
shift_agent → insights_agent (7 cases)
```

###### Pattern extraction inside clusters

Next step, within each confusion cluster we can use an LLM to sample the examples with the common traits.

**Example LLM Pattern Extractor Prompt**

```sh
Here are questions where the model chose rag_agent
but sre_agent was correct.

Identify common characteristics in these questions.
Return a short description.
```

The potential outputs might be:

```sh
- User is trying to find information about incident
- Is asking generic questions about what a specific incident is
- Is asking about runbook of incident
```

**Example of Failure Clustering Step Output**

The failure clustering output is crucial to feed to LLM to improve prompt. An example of rich json containing the data is as follows:

```json
{
  "confusion_pair": "sre_agent → rag_agent",
  "count": 18,
  "pattern": [
    "User is trying to find information about incident",
    "Is asking generic questions about what a specific incident is",
    "Is asking about runbook of incident"
  ]
}
```

#### Prompt Optimization - Learning Step

Now that we have the Failures and the original prompt, the next step is to improve that prompt. The inputs that we need are:

- Current Prompt
- Error Clusters
- Constraints

The constraints are hardcoded rules of crafting a new prompt. Follow the example of the meta prompt of the LLM:

```sh
You are improving a tool-selection prompt.

Current prompt:
<<< PROMPT >>>

Observed errors:
- The router chose sre_agent instead of rag_agent
  for questions about:
  - User is trying to find information about incident,
  - Is asking generic questions about what a specific incident is,
  - Is asking about runbook of incident

Goal:
- Reduce these misclassifications.

Constraints:
- Do not add examples.
- Do not increase length by more than 20%.
- Prefer general rules over specific patterns.

Return the full revised prompt.
```

#### Validation step

Given the new prompt, we will only accept it if it is better than the previous one. hence we run the validation set and extract the loss over the new prompt. Accept it only if there is an improvement.

```python
  validation_loss, _ = evaluate(candidate_prompt, validation_set)

  if val_loss < best_val_loss:
    prompt = candidate_prompt
    best_val_loss = val_loss
```

What if the new prompt is not better? Are we to rerun the same loop and hit the same problem? Welcome to the stochastic sampling step:

##### Multiple Candidates vs Single Candidate

The issue with single prompt candidate is that the we do not know if the output is better until we try. But what if we run it twice, and the second happens to be better already? What if we do it 5 times, and the 3rd was better? Well then we should indeed run it 5 times and choose option number 3.

The above is possible because LLM output is a distribution, so event if we are providing the same set of inputs (same initial prompt, errors list, and meta prompt), we can get different valid outputs. To achieve some level of "randomness" there, we can **biase** the LLM into making different choices. This is called **stochastic sampling** in ML. Stochastic sampling means the LLM is allowed to make random but biased choices when generating text. To biase LLM we can vary the following things:

- `seed` - to toggle the randomness of generated text
- `temperature` - to change the creativity level of LLM

The above are just parameters when calling LLM:

```python
response = llm.generate(
    prompt="Rewrite this prompt...",
    temperature=0.7,
    seed=42,
    ...
)
```

Other ways to biase it is to:

- Change the order of errors
- Change the constraints
- Change the meta prompt wording

Overall the goal is to biase LLM into producing another better prompt, so instead of having the following:

```sh
prompt → optimizer → candidate
```

We get several candidates:

```sh
prompt → optimizer → {c₁, c₂, c₃, c₄, c₅}
```

##### What does it look like in practice?

**Candidate A (tight rule)**

“If the user is asking about operational incidents, outages, or runbooks, always prefer sre_agent over rag_agent.”

**Candidate B (semantic reframing)**

“Use rag_agent only for static documents. Questions about live or historical incidents belong to sre_agent.”

**Candidate C (hierarchy)**

“When both agents seem relevant, prioritize sre_agent for incident-related queries.”

**Candidate D (negative constraint)**

“Do not route incident explanations or runbook questions to rag_agent.”

##### Final Pseudo Code

The we evaluate each candidate and select the best one. Example of pseudo-code

```python
prompt = load_best_prompt()
training_set, validation_set = split_dataset()
best_prompt = prompt
best_val_loss = evaluate(prompt, validation_set)

for iteration in range(K):
    train_loss, traces = evaluate(best_prompt, training_set)
    failure_summary = cluster_failures(traces)

    # Generate a *set* of candidates
    candidates = [
        optimize_prompt(best_prompt, failure_summary, seed=i)
        for i in range(N)
    ]

    scored = []
    for p in candidates:
        val_loss, _ = evaluate(p, validation_set)
        scored.append((p, val_loss))

    best_candidate, best_candidate_loss = min(scored, key=lambda x: x[1])

    if best_candidate_loss < best_val_loss:
        best_prompt = best_candidate
        best_val_loss = best_candidate_loss
    else:
        break  # converged
```

#### The Stopping Criteria

1. No improvement

Stop if none of the candidates in the iteration beat the current best validation loss.

This is simple hill-climbing with a plateau check.

Works well if you generate 5–10 candidates per iteration.

2. Max iterations

Add a hard limit K_max to prevent infinite loops in case of small oscillations.

3. Early convergence tolerance (optional)

Stop if improvement is below a threshold, e.g., <0.01 decrease in loss.

Helps avoid overfitting to tiny validation differences.

4. Optional: patience

If no improvement for N_patience consecutive iterations, stop.

Useful if some iterations are slightly worse but later ones improve.

Example updated pseudo-code

```python
prompt = load_best_prompt()
training_set, validation_set = split_dataset()
best_prompt = prompt
patience_counter = 0
tolerance = 1 # 1% percent improvement minimum. Discard below 1% improvements

for iteration in range(K_max):
    train_loss, traces = evaluate(best_prompt, training_set)
    failure_summary = cluster_failures(traces)

    # Generate multiple candidates with stochastic sampling
    candidates = [optimize_prompt(best_prompt, failure_summary, seed=i)
                  for i in range(N_candidates)]

    # Evaluate all candidates
    loss = [(p, evaluate(p, validation_set)) for p in candidates]

    # Pick the best candidate
    best_candidate, best_candidate_loss = min(loss, key=lambda x: x[1])

    # Check for improvement
    if best_candidate_loss < best_val_loss - tolerance:
        best_prompt = best_candidate
        best_val_loss = best_candidate_loss
        patience_counter = 0
    else:
        patience_counter += 1
        if patience_counter >= N_patience:
            break  # stop, no improvement

return best_prompt
```

## POC - Experiment

For the experiment, we are using PD Advance Coordinator Agent. This agent was chosen because of the following reasons:

- It has the most labeled dataset
- The goal of the agent is to choose the right tool, so each tool description can be optimized in a more deterministic way.
- Easier to cluster errors (Chose tool SRE Agent instead of RAG Agent, Chose tool Insights Agent instead of RAG Agent, etc.)

### Selecting the dataset and prompt

For the proof of concept we will focus on a single tool optimization.

1. We will choose the SRE Agent tool and it is a prompt
2. We will select a dataset of 10-15 entries (small for demo). The dataset should contain successful entries, and failed. The failed are the ones that "should have been sre_agent".

The dataset was handpicked:

```sh
(predicted_tool → correct_tool)
```

1. 9fd987d6-1500-4431-bc62-78b621e68167 (shift_agent -> sre_agent)
2. 8c746bcb-a77d-4621-ab5c-449baffc48e2 (shift_agent -> sre_agent)
3. 04f296f1-2514-4314-ae8e-d5113a930b95 (shift_agent -> sre_agent)
4. 314b8385-b0c4-43ba-b05b-6f4ef018f013 (rag_agent -> sre_agent)
5. a99dd97f-cf64-4b3f-934f-7a3fb9eec5e8 (rag_agent -> sre_agent)
6. 08b46ac0-679a-4591-8962-e71506259c2b (sre_agent -> sre_agent)
7. a31d04c8-95a0-4928-9094-76fd37e6c1ea (sre_agent -> sre_agent)
8. 60489eeb-7bd8-4120-b0c1-37282f6ea8fb (sre_agent -> sre_agent)
9. 9f108021-9610-4412-bae1-ceccce934063 (sre_agent -> sre_agent)
10. 28c6828e-506c-4f04-ba85-9f1ef5313a8a (sre_agent -> sre_agent)
11. 0b02526e-f0ce-42e4-8e39-29d234fe4bd8 (sre_agent -> sre_agent)
12. bd50fd00-e359-4f50-b289-1106dc0f6d77 (sre_agent -> sre_agent)
13. 974091b8-e2be-476a-970e-8be77a41de72 (sre_agent -> sre_agent)
14. 5d342747-9f3b-412b-ab49-5b932a3d6c70 (sre_agent -> sre_agent)
15. f8754d7a-a9b5-423d-ba3a-bf99eea9bf0d (sre_agent -> sre_agent)
