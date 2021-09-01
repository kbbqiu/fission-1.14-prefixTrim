const SQS = require('aws-sdk').SQS;

const REGION = 'us-east-1';
const AWS_ACCOUNT = 'XXXXXXXXXXXXXX';
const QUEUE_PREFIX = `https://sqs.${REGION}.amazonaws.com/${AWS_ACCOUNT}/`;

exports.producer = async function producer() {

  try {
    await queueSQSFunction();

    const message = 'Successfully enqueued message to SQS'
    console.log(message)
    return {
      status: 200,
      body: message
    };

  } catch (err) {
    console.log(err)
    return {
      status: 510,
      body: err,
    }
  }
};

const sqs = new SQS({ region: REGION });

const queueSQSFunction = () => {
  return sqs.sendMessage({
    QueueUrl: QUEUE_PREFIX + 'ad-usage-cache-campaign-development',
    MessageBody: JSON.stringify({ message: "World"}),
  })
  .promise();
};

exports.consumer = async function consumer(context) {
  console.log(context.request.body);
  let obj = context.request.body;
  return {
      status: 200,
      body: "Hello "+ JSON.stringify(obj.message)
  };
}
