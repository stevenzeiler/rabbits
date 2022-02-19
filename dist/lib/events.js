"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const EventEmitter2 = require('eventemitter2');
const store_1 = require("./store");
const amqp_1 = require("./amqp");
class Events {
    constructor() {
        this.exchange = 'rabbi.events';
        this.emitter = new EventEmitter2({
            wildcard: true
        });
        this.init();
        this.store = store_1.store;
    }
    on(event, callback) {
        this.emitter.on(event, callback);
    }
    init() {
        return __awaiter(this, void 0, void 0, function* () {
            let channel = yield amqp_1.getChannel();
            channel.assertExchange(this.exchange, 'direct');
        });
    }
    emit(event, payload = {}) {
        return __awaiter(this, void 0, void 0, function* () {
            this.emitter.emit(event, payload);
            let channel = yield amqp_1.getChannel();
            channel.publish(this.exchange, event, Buffer.from(JSON.stringify(payload)));
            if (this.store.isAvailable) {
                return this.store.storeEvent(event, payload);
            }
        });
    }
}
const events = new Events();
exports.events = events;
//# sourceMappingURL=events.js.map