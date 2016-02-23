import {
  IPCEventEmitter,
  IPCChannelNotFoundError,
  InvalidProcessObjectError,
  IPC_EVENT_SIGNATURE
} from '../../src/IPCEventEmitter';
import { ChildProcess } from 'child_process';
import { EventEmitter } from 'events';

describe('IPCEventEmitter', () => {
  it('should be a class', () => {
    return expect(IPCEventEmitter).to.be.a('function');
  });

  it('should be newable', () => {
    const process = new ChildProcess();
    process.send = () => {};
    return expect(new IPCEventEmitter(process))
      .to.be.instanceof(IPCEventEmitter);
  });

  it('should extends EventEmitter', () => {
    return expect(IPCEventEmitter.prototype).to.be.instanceof(EventEmitter);
  });

  it('should throw InvalidProcessObjectError on invalid process', () => {
    return expect(() => {
      return new IPCEventEmitter({});
    }).to.throw(InvalidProcessObjectError);
  });

  it('should thow IPCChannelNotFoundError on process without ipc', () => {
    return expect(() => {
      return new IPCEventEmitter(new ChildProcess());
    }).to.throw(IPCChannelNotFoundError);
  });

  it('should provide a method .emit()', () => {
    return Promise.all([
      expect(IPCEventEmitter.prototype).to.have.ownProperty('emit'),
      expect(IPCEventEmitter.prototype.emit).to.be.a('function')
    ]);
  });

  describe('.emit()', () => {
    it('.emit() shoud returns a promise', () => {
      const process = new EventEmitter();
      process.send = (payload, callback) => {
        if (callback) {
          callback();
        }
      };
      const ipc = new IPCEventEmitter(process);
      const promise = ipc.emit('testEvent');
      return expect(promise).to.be.instanceof(Promise);
    });

    it('should resolve when ipc message is transmitted/received', () => {
      const process = new EventEmitter();
      process.send = (payload, callback) => {
        if (callback) {
          callback();
        }
      };
      const ipc = new IPCEventEmitter(process);
      const promise = ipc.emit('testEvent');
      return expect(promise).to.be.fulfilled;
    });

    it('should reject when ipc message send error', () => {
      const process = new EventEmitter();
      process.send = (payload, callback) => {
        if (callback) {
          return callback(new Error('oups'));
        }
        throw new Error('oups');
      };
      const ipc = new IPCEventEmitter(process);
      const promise = ipc.emit('testEvent');
      return expect(promise).to.be.rejected;
    });
  });

  it('should emit event on ipc message', async () => {
    const process = new EventEmitter();
    process.send = (payload, callback) => {
      if (callback) {
        callback();
      }
    };
    const ipc = new IPCEventEmitter(process);
    const data = await new Promise((resolve, reject) => {
      ipc.on('testEvent', resolve);
      process.emit('message', {
        magic: IPC_EVENT_SIGNATURE,
        eventName: 'testEvent',
        data: '[{"foo":"bar"}]'
      });
    });

    return expect(data).to.be.deep.equal({
      foo: 'bar'
    });
  });

  it('should send ipc message on emit', async () => {
    const process = new EventEmitter();
    const payload = await new Promise((resolve, reject) => {
      process.send = (payload, callback) => {
        if (callback) {
          callback();
        }
        return resolve(payload);
      };

      const ipc = new IPCEventEmitter(process);
      ipc.emit('testEvent', { foo: 'bar' });
    });

    return expect(payload).to.be.deep.equal({
      magic: IPC_EVENT_SIGNATURE,
      eventName: 'testEvent',
      data: '[{"foo":"bar"}]'
    });
  });
});
