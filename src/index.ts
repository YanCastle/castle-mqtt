import { connect } from 'mqtt'
export enum QosType {
    ONLY_ONE = 2,
    LESS_ONE = 1,
    NOT_ENSURE = 0
}
export enum MqttEvent {
    PUBLISHED = 0,
    SUBSCRIBED = 1,
    UNSUBSCRIBED = 2,
    CONNECTED = 3,
}
export default class Mqtt {
    client;
    prefix: string = '';
    uuid: string = '';
    cb: any = {};
    constructor(url: string, prefix: string = '', uuid: string = '') {
        let client = connect(url)
        this.prefix = prefix;
        this.uuid = uuid;
        client.on('connect', this.connected)
        client.on('error', this.error)
        client.on('message', this.message)
    }
    message(topic: string, payload: string) {
        let all = payload.substr(0, 1) == '1'
        let spos = payload.indexOf('|');
        let uuid = payload.substr(1, spos - 1)
        let data = payload.substr(spos + 2)
        try {
            let o = JSON.parse(data)
            data = o;
        } catch (error) {

        } finally {
            if (all || this.uuid == uuid)
                this.fire(topic.replace(this.prefix, ''), {
                    data,
                    uuid,
                    all
                })
        }
    }
    connected() { }
    error() { }
    publish(topic: string, data: any, all: boolean = false) {
        this.client.publish(this.prefix + topic, (all ? 1 : 0) + this.uuid + '|' + (data instanceof String ? data : (data instanceof Buffer ? data : JSON.stringify(data))))
        this.fire(MqttEvent.PUBLISHED, {
            topic, data, all
        })
    }
    subscribe(topic: string | string[], type: number, cb: (data: string, uuid: string, i: string) => void) {
        if (topic instanceof Array) {
            topic.forEach(e => {
                this.on(e, cb)
                this.client.subscribe(this.prefix + e, { qos: type })
            })
        } else if ('string' == typeof topic) {
            this.on(topic, cb)
            this.client.subscribe(this.prefix + topic, { qos: type })
        } else {

        }
        this.fire(MqttEvent.SUBSCRIBED, {
            topic, type
        })
    }
    unsubscribe(topic: string | string[]) {
        if (topic instanceof Array) {
            topic.forEach(e => {
                this.un(e)
                this.client.unsubscribe(this.prefix + e)
            })
        } else if ('string' == typeof topic) {
            this.un(topic)
            this.client.unsubscribe(this.prefix + topic)
        } else {

        }
        this.fire(MqttEvent.UNSUBSCRIBED, {
            topic
        })
    }
    fire(e: MqttEvent | string, data: any) {
        if (this.cb[e]) {
            this.cb[e].forEach(element => {
                if (element instanceof Function) {
                    element(...data)
                }
            });
        }
    }
    on(e: MqttEvent | string, cb: Function) {
        if (!this.cb[e]) {
            this.cb[e] = []
        }
        this.cb[e].push(cb)
    }
    un(e: MqttEvent | string) {
        if (this.cb[e]) {
            delete this.cb[e]
        }
    }
}