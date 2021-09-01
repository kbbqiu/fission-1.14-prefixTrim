# prefixTrim bug on SQS message queue consumer

I believe this is a new issue related to this feature added recently. It's also triggered in a specific scenario. I don't really know golang or fission internals, but will try to take a look at the code.
- https://github.com/fission/fission/issues/2132

I've tested in 1.13.1 w/o issue.

## The error

```
# router
---
router-7779cddcd7-fkkq7 router 2021-09-01T18:37:51.888Z	DEBUG	triggerset.http_trigger_set.okay-now-world.roundtripper	router/functionHandler.go:287	function invoke url	{"function": "hello-world", "namespace": "default", "prefixTrim": "/fission-function/hello-world", "keepPrefix": false, "hitURL": "/-consumer"}
```

After this prefix trim `/-consumer` is not a valid path. functions hit max concurrency error and then becomes stuck in a retry loop.


## Setup

I've created a simple hello-world example to demonstrate what I'm experiencing. It's not a perfect replica of the issue in our development environment.
We have a custom typescript/node14 environment that we built with the node 12.16 environment as our base.

In our custom environment, I can simply run `fission spec apply` to hit this issue. In this example repo, we need to apply in 2 stages. 1) Apply the producer func. 2) Apply consumer func + mq trigger.
This leads me to believe that there is a race condition in how the router/executor is cache the fission endpoints and we hit that race condition in our typescript environment b/c of the 
larger package size or longer build stage.

### This example includes:
- 1 Package
  - This package index.js contains both the `producer` and `consumer` handlers.
- 2 Functions
  - `producer` function - index.producer - named `hello-world`
  - `consumer` function - index.consumer - named `hello-world-consumer`
- 1 Node Environment
- 1 MessageQueueTrigger

### How to reproduce
I suppose this could be set up in localstack, but I've just done it in AWS here...

#### Requirements
- Fission 1.14.1
- AWS SQS Queues for MQ Trigger
- AWS Credentials for Producer as well as MQ Trigger

#### Steps
- Make sure `specs/env-nodejs.yaml` has AWS crdentials
- Update `function/index.js` with correct `REGION` and `AWS_ACCOUNT`
- `fission spec apply`
- Uncomment `specs/function-consumer.yaml` and `specs/mqtrigger-sqs.yaml`
- Replace SQS values in `specs/mqtrigger-sqs.yaml`
- `fission spec apply`
- `fission function test --name hello-world`
- Examine environment pods and router logs
  
### Observations
- No errors if I rename the producer and consumer functions so that the producer is not a substring/prefix of consumer
- In fission metrics, I actually see a bunch of 404s for /-consumer path which is what I am expecting. I believe earlier on in my discovery, I was actually seeing 404s. From my most recent tests using this example, I'm seeing:
  ```
  [01/Sep/2021:19:18:03 +0000] "POST /-campaign HTTP/1.1" 200 53 "-" "Go-http-client/1.1"
  ```
- See the loop.mov video. You can see the issue around 15 second mark. Stuck in a loop.
  