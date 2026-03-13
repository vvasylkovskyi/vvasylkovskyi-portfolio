<!-- # Building Pagerduty Advance MCP - Deep Dive

"Focus on the process of providing a way for our customers to interact with our Pagerduty AI Agents via MCP Server. Remembering the MCP Server of pagerduty https://www.pagerduty.com/eng/lessons-learned-while-building-pagerduty-mcp-server/, use as motivation for the rearchitecting into multiple MCP servers. Deep dive about how these MCP servers are built.

Imagine this: you have built your MCP server and it contains all the tools necessary to interact with your product. But as you build your product, new features are created, your perfect MCP server with ten tools now has 50. The MCP Clients performance degrade, wrong tools get selected, and the user experience with the now bloated MCP server starts to degrade as well. How about 100 tools?

At Pagerduty. As we grow we realized that our MCP server will eventually face the same fate. So how do we ensure that our MCP server delivers optimal user experience to our users?

## How we grow our MCP server toolset without impacting user experience

We want as much modularity as we can get and follow industry best practices while optimizing for better user choice and flexibility. While thinking about best MCP Server architecture we found the following truth that guide our decision:

- With the growing list of MCP tools, we have observed that MCP clients often struggle with similar tool descriptions, yielding unpredictable the choice of tool by MCP clients
- The users often don't care about having all MCP tools installed. They want to get the work done and often know what tools they need.

So the path forward is clear, we need to provide the way to our customers to choose only the tools that they want, and at the same time free overhead from MCP clients, already overloaded with too many tools.

## The decision process of architecting MCP server

Given that we have clear requirements, how do we let our users have better choice on what tools our users can select? From our research in MCP there are several options.

### Option 1: MCP server with custom flags

We can provide flags to our MCP server that will enable or disable certain tools.

#### Local MCP Server

With local we can build our server in a way that users can pass in extra argument or `env var` that selected only subset of tools.

#### Remote MCP Server

The `env var` wouldn't work on remote MCP server, however setting custom headers such as `X-Disabled-tools=` could do the similar trick.

### Splitting MCP server into multiple sub servers

Another obvious choice is to split the MCP server into multiple MCP servers. Each MCP server then would have a subset of tools. The users can setup multiple MCP servers as follows:

```json
{
  // Example in VS Code Client mcp.json
  "servers": {
    "remote-pagerduty-mcp": {
      // `n` tools for Pagerduty V2 API
      "url": "https://mcp.pagerduty.com/mcp"
    },
    "remote-pagerduty-advance-mcp": {
      // 1 tool for PD Advance AI Agent
      "url": "https://mcp.eu.pagerduty.com/pagerduty-advance-mcp"
    }
  }
}
```

### The Final Decision

We have decided to go with the approach of splitting MCP server into multiple sub servers. Why having multiple modular MCP servers instead of one big MCP server better?

- **Smart default**: Users don't have to add extra configurations to disable tools to improve MCP client performance. Given that the setup of extra server is trivial and familiar to the user
- **Clearer Boundaries of Responsibility**: Each server has a distinct purpose and toolset, simplifying development, maintenance and troubleshooting.
- **Better MCP Client Support**: Splitting tools via extra HTTP Headers is risky as the MCP is still evolving and many [MCP SDKs don't support adding extra headers](https://dev.to/_neronotte/how-to-access-custom-http-headers-in-your-c-mcp-server-heb)

--- -->

# Pagerduty Advance MCP Release

We have built a new Pagerduty Advance MCP Server which is an MCP to interact with our PD Advance AI Agent. Users can now connect their MCP client directly to AI Agent. You can find it here [link to open source repo](..todo..)

## How to expose AI Agent as MCP Server

... TODO Add Diagrams ...

... Explain quickly how MCP Interacts with AI MCP as tool to that calls API ...

## Building MCP for Pagerduty AI Agent – A Deep Dive into Scalable MCP Architecture

... TODO Add Diagrams ...

As PagerDuty continues to expand its AI-driven capabilities, one question keeps surfacing:

**How do we scale our Model Context Protocol (MCP) server to support rapid growth—without sacrificing performance or user experience?**

Our MCP server started as a clean, all-in-one system containing every tool our customers needed to interact with PagerDuty. But as our product evolved, so did our toolset. What began with ten tools soon became fifty. [MCP Clients with too many tools is known to decrease context window, leading to poorer LLM accuracy in responses](https://demiliani.com/2025/09/04/model-context-protocol-and-the-too-many-tools-problem/).

We realized that unless we rethought our architecture, our MCP server would eventually collapse under its own weight.

> **In this post:** We’ll explore how we rearchitected our MCP system—splitting one large server into multiple modular MCP servers—to deliver a faster, clearer, and more flexible experience for our users.

---

## The Problem: Growth Comes with Complexity

Every MCP tool is designed to help users interact with different aspects of the PagerDuty ecosystem. But with each new feature, our “perfect” MCP server became harder to maintain and slower to use.

We noticed two recurring issues:

- **Tool overload:** MCP clients began to make inconsistent choices between tools with similar descriptions, leading to unpredictable outcomes.
- **Irrelevant options:** Users didn’t want _every_ MCP tool—they wanted the right set of tools to complete their specific tasks.

> ⚙️ **Challenge:** How can we grow our MCP toolset without impacting performance or overwhelming our users?

---

## Our Design Principles

Before jumping into code or infrastructure changes, we aligned on a few core principles to guide our solution:

1. **User choice and flexibility** – Users should be able to select the tools that matter most to them.
2. **Predictable performance** – The client experience should remain fast and consistent, even as our toolset grows.

---

## Exploring the Options

We explored multiple approaches for giving users control over which MCP tools to load.

### Option 1: Single MCP Server with Custom Flags

We could allow users to enable or disable certain tools through flags or environment variables.

#### Local MCP Server

For local deployments, users could pass an additional argument or set an environment variable, such as:

```bash
MCP_ENABLED_TOOLS="pd_ai,pd_analytics"
```

#### Remote MCP Server

In a remote setup, environment variables don’t apply. However, custom HTTP headers—such as `X-Disabled-Tools` could selectively disable tools for a given session.

**Pros**: Minimal setup, backward compatible.

**Cons**: Complexity increases quickly; [header-based control isn’t well supported across all MCP SDKs](<(https://dev.to/_neronotte/how-to-access-custom-http-headers-in-your-c-mcp-server-heb)>).

### Option 2: Split the MCP Server into Multiple Sub-Servers

Our second approach was to break the monolith. Each MCP sub-server would host a smaller, dedicated toolset—focused on a specific domain or feature.

Example configuration in a VS Code MCP client:

```json
{
  "servers": {
    "remote-pagerduty-mcp": {
      "url": "https://mcp.pagerduty.com/mcp"
    },
    "remote-pagerduty-advance-mcp": {
      "url": "https://mcp.pagerduty.com/pagerduty-advance-mcp"
    }
  }
}
```

**Pros:**

- **Smart defaults** - users only load what they need
- **Clear boundaries** - of responsibility for each team and service

**Cons**: Slightly more setup for users, but the tradeoff is improved performance and reliability.

## The Decision: Modular Wins

After prototyping both options, the decision was clear - **splitting into multiple sub-servers** offered the best balance of simplicity, performance, and maintainability.

### Why it Worked

- **Smart defaults**: Users don’t need extra configuration to optimize performance—each server is already lightweight.
- **Separation of concerns**: Each MCP server has a distinct purpose, making it easier to develop, test, and troubleshoot.
- **Future compatibility**: Many MCP SDKs still lack full header customization support, making the sub-server model more reliable long-term.

Modular MCP architecture gives us scalable performance, faster client responses, and a more predictable developer experience.

### Infrastructure overhead twist

... Add the decision of setting single infrastructure Web Server, with mounted FastMCP servers on routes.

## Lessons Learned

- **Design for modularity early**. What starts as a small, manageable system will eventually grow beyond what one server can handle.
- **Empower your users with choice**. Flexibility is key—users know their workflows best.
- **Simplify maintenance for developers**. Smaller, domain-focused MCP servers reduce cognitive load and deployment risk.
