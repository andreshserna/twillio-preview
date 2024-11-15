const { prepareFlexFunction, extractStandardResponse } = require(Runtime.getFunctions()[
  'common/helpers/function-helper'
].path);
const TaskOperations = require(Runtime.getFunctions()['common/twilio-wrappers/taskrouter'].path);
const ChatOperations = require(Runtime.getFunctions()['features/chat-transfer/common/chat-operations'].path);

const requiredParameters = [
  {
    key: 'conversationId',
    purpose: 'conversation_id to link tasks for reporting',
  },
  {
    key: 'jsonAttributes',
    purpose: 'JSON calling tasks attributes to perpetuate onto new task',
  },
  {
    key: 'transferTargetSid',
    purpose: 'sid of target worker or target queue',
  },
  {
    key: 'transferQueueName',
    purpose: 'name of the queue if transfering to a queue, otherwise empty string',
  },
  {
    key: 'ignoreWorkerContactUri',
    purpose: 'woker Contact Uri to ignore when transfering',
  },
];

exports.handler = prepareFlexFunction(requiredParameters, async (context, event, callback, response, handleError) => {
  try {
    const {
      conversationId,
      jsonAttributes,
      transferTargetSid,
      transferQueueName,
      ignoreWorkerContactUri,
      workflowSid: overriddenWorkflowSid,
      timeout: overriddenTimeout,
      priority: overriddenPriority,
    } = event;

    // use assigned values or use defaults
    const workflowSid = overriddenWorkflowSid || process.env.TWILIO_FLEX_CHAT_TRANSFER_WORKFLOW_SID;
    const timeout = overriddenTimeout || 86400;
    const priority = overriddenPriority || 0;

    // setup the new task attributes based on the old
    const originalTaskAttributes = JSON.parse(jsonAttributes);
    const newAttributes = {
      ...originalTaskAttributes,
      ignoreWorkerContactUri,
      transferTargetSid,
      transferQueueName,
      transferTargetType: transferTargetSid.startsWith('WK') ? 'worker' : 'queue',
      conversations: {
        ...originalTaskAttributes.conversations,
        conversation_id: conversationId,
      },
    };

    // create task for transfer
    const result = await TaskOperations.createTask({
      context,
      workflowSid,
      taskChannel: 'chat',
      attributes: newAttributes,
      priority,
      timeout,
      attempts: 0,
    });

    const {
      task: {
        sid: taskSid,
        attributes: { channelSid },
      },
      success,
      status,
    } = result;

    // push task data into chat meta data so that should we end the chat
    // while in queue the customer front end can trigger cancelling tasks associated
    // to the chat channel this is not critical to transfer but is ideal
    try {
      if (success)
        await ChatOperations.addTaskToChannel({
          context,
          taskSid,
          channelSid,
          attempts: 0,
        });
    } catch (error) {
      console.error('Error updating chat channel with task sid created for it');
    }

    response.setStatusCode(status);
    response.setBody({ taskSid, ...extractStandardResponse(result) });

    return callback(null, response);
  } catch (error) {
    return handleError(error);
  }
});
