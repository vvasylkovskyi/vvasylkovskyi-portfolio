# API keys - Generating Long-lived tokens for backend access

In the previous notes we described about how to generate short-lived tokens - a JWT that authenticate user to our apps. Short lived tokens provide enhanced security since even if leaked, they will expire soon, usually in 15-60min. Despite great security, There may be situations where short-lived tokens are not practical, such as backend usage, because they may be constantly expiring. For this reason there are long-lived tokens, also known as API Keys.

In this notes we will discuss about how to provisiong long lived tokens securely. We will cover the following:

- How to generate long-lived tokens securely and link them to the user
- How to store them and verify validity
- Important note about revokation of the tokens

Let's dive in

## Generating API Keys
