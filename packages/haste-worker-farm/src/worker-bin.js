let modulePath = null;

process.on('message', ({ type, options }) => {
  console.log(type, process.pid);

  switch (type) {
    case 'CHILD_MESSAGE_INITIALIZE':
      modulePath = options.modulePath;
      break;

    case 'CHILD_MESSAGE_CALL':
      execute({ options });
      break;

    default:
      throw new TypeError('Unexpected request from parent process');
  }
});

async function execute({ options }) {
  const worker = {
    idle: (result) => {
      process.send({ type: 'PARENT_MESSAGE_IDLE', result });
    },
    complete: (result) => {
      process.send({ type: 'PARENT_MESSAGE_COMPLETE', result });
    },
    error: (error) => {
      if (error) {
        console.log(error.stack || error);
      }

      process.send({
        type: 'PARENT_MESSAGE_ERROR',
        error,
      });
    },
  };

  let result;

  try {
    result = require(modulePath)(options, { worker });
  } catch (error) {
    return worker.error(error);
  }

  if (result instanceof Promise) {
    result.then(worker.complete, worker.error);
  }

  process.on('uncaughtException', (error) => {
    worker.error(error);
  });
}