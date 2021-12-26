## Github Actions Pull
A simple way to do continuous integration with github actions.

### Usage
This is a node application. You need to have node 16 or newer and npm installed for it to run.

First, rename the config.default.ts into config.ts, and fill it with your information. You will have to create a GitHub webhook on action complete and direct it to the url and port where this server runs.

When you're done, just run 
```bash
npm run serve
```
And the server will listen at the specified port. Whenever the github webhook calls it, it will pull the latest artifact, download  and unzip it on the specified directory.
