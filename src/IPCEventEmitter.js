import { ChildProcess } from 'child_process';
import { EventEmitter } from 'events';
import semver from 'semver';
import AbstractError from '@hexeo/abstract-error';
import JSONB from '@hexeo/json-buffer';

export const IPC_EVENT_SIGNATURE = 'heXeo-ipc';
const isNodePreVersion4 = semver.lt(process.version, '4.0.0');

export class IPCChannelNotFoundError extends AbstractError {
  constructor (errors) {
    super(errors);
    this.statusCode = 500;
    this.reason = 'ipc_channel_not_found';
  }
}

export class InvalidProcessObjectError extends AbstractError {
  constructor (errors) {
    super(errors);
    this.statusCode = 500;
    this.reason = 'invalid_process_object';
  }
}

export class IPCEventEmitter extends EventEmitter {
  constructor (process) {
    super();

    if (!(process instanceof ChildProcess) &&
        !(process instanceof EventEmitter)) {
      throw new InvalidProcessObjectError();
    }

    if (!process.send) {
      throw new IPCChannelNotFoundError();
    }

    this.process = process;
    this.process.on('message', (message) => {
      if (typeof message === 'object' && message.magic === IPC_EVENT_SIGNATURE) {
        const args = JSONB.parse(message.data);
        super.emit(message.eventName, ...args);
      }
    });
  }

  emit (eventName, ...data) {
    const payload = {
      magic: IPC_EVENT_SIGNATURE,
      eventName: eventName,
      data: JSONB.stringify(data)
    };

    return new Promise((resolve, reject) => {
      if (isNodePreVersion4) {
        process.nextTick(() => {
          try {
            this.process.send(payload);
            return resolve();
          } catch (error) {
            return reject(error);
          }
        });
      } else {
        const callbackHandler = (error) => {
          if (error) {
            return reject(error);
          }
          return resolve();
        };
        this.process.send(payload, callbackHandler);
      }
    });
  }
}

export default IPCEventEmitter;
