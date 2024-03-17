"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Actor = void 0;
const uuid = require("uuid");
const events_1 = require("events");
const logger_1 = require("./logger");
const amqp_1 = require("./amqp");
const defaultExchange = 'default';
const defaultExchangeType = 'direct';
class Actor extends events_1.EventEmitter {
    constructor(params) {
        super();
        this.heartbeatMilliseconds = 10000; // Timeout from setInterval
        const actorParams = Object.assign({
            exchange: 'default',
            queue: params.routingkey,
            exchangeType: 'direct'
        }, params);
        if (!params.exchange) {
            actorParams.exchange = 'default';
        }
        if (!actorParams.queue) {
            actorParams.queue = actorParams.routingkey;
        }
        this.consumerTag = uuid.v4();
        if (!actorParams.exchangeType) {
            actorParams.exchangeType = 'direct';
        }
        if (!actorParams.routingkey) {
            actorParams.routingkey = actorParams.queue;
        }
        this.actorParams = actorParams;
    }
    toJSON() {
        return {
            exchange: this.actorParams.exchange,
            routingkey: this.actorParams.routingkey,
            queue: this.actorParams.queue,
            queueOptions: this.actorParams.queueOptions || {},
        };
    }
    connectAmqp(connection) {
        return new Promise((resolve, reject) => __awaiter(this, void 0, void 0, function* () {
            if (this.actorParams.connection) {
                this.connection = this.actorParams.connection;
            }
            else {
                this.connection = yield (0, amqp_1.getConnection)();
                logger_1.log.info(`rabbi.amqp.connected`);
            }
            if (this.actorParams.channel) {
                this.channel = this.actorParams.channel;
            }
            else {
                this.channel = yield this.connection.createChannel();
            }
            logger_1.log.info('rabbi.amqp.channel.created');
            //this.channel.checkExchange(this.actorParams.exchange, async (err) => {
            yield this.channel.assertExchange(this.actorParams.exchange, this.actorParams.exchangeType);
            yield this.channel.assertQueue(this.actorParams.queue, this.actorParams.queueOptions);
            logger_1.log.info('rabbi.amqp.binding.created', this.toJSON());
            yield this.channel.bindQueue(this.actorParams.queue, this.actorParams.exchange, this.actorParams.routingkey);
            yield this.channel.prefetch(this.actorParams.prefetch || 1);
            resolve(this.channel);
            //})
        }));
    }
    static create(connectionInfo) {
        let actor = new Actor(connectionInfo);
        return actor;
    }
    defaultConsumer(channel, msg, json) {
        return __awaiter(this, void 0, void 0, function* () {
            const message = msg.content.toString();
            logger_1.log.info(message);
        });
    }
    stop() {
        return __awaiter(this, void 0, void 0, function* () {
            if (this.channel && this.consumerTag) {
                this.channel.cancel(this.consumerTag);
            }
        });
    }
    start(consumer) {
        return __awaiter(this, void 0, void 0, function* () {
            var json;
            let channel = yield this.connectAmqp(this.actorParams.connection);
            yield channel.assertExchange(this.actorParams.exchange, this.actorParams.exchangeType);
            yield channel.publish('rabbi', 'actor.started', Buffer.from(JSON.stringify(this.toJSON())));
            this.heartbeatInterval = setInterval(() => __awaiter(this, void 0, void 0, function* () {
                yield channel.publish('rabbi', 'actor.heartbeat', Buffer.from(JSON.stringify(this.toJSON())));
            }), this.heartbeatMilliseconds);
            channel.consume(this.actorParams.queue, (msg) => __awaiter(this, void 0, void 0, function* () {
                try {
                    json = JSON.parse(msg.content.toString());
                }
                catch (error) {
                }
                if (consumer) {
                    try {
                        let result = yield consumer(channel, msg, json);
                    }
                    catch (error) {
                        console.error('rabbi.exception.caught', error.message);
                        // TODO: Send Message to UnhandledExceptions exchange
                    }
                }
                else {
                    this.defaultConsumer(channel, msg, json);
                }
                yield channel.ack(msg); // auto acknowledge
            }), {
                consumerTag: this.consumerTag
            });
        });
    }
}
exports.Actor = Actor;
//# sourceMappingURL=actor.js.map