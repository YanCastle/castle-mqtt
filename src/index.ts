import { connect } from 'mqtt'
import { EventEmitter } from 'events';
export enum QosType {
    ONLY_ONE = 2,
    LESS_ONE = 1,
    NOT_ENSURE = 0
}
export enum MqttEvent {
    PUBLISHED,
    SUBSCRIBED,
    UNSUBSCRIBED,
    CONNECTED,
}
export enum DataType {
    Buffer,
    String,
    Number,
    Object,
    Boolean,
    Event
}
export default class Mqtt {
    client;
    prefix: string = '';
    uuid: string = '';
    cb: any = {};
    match: any = {};
    constructor(url: string, prefix: string = '', uuid: string = '') {
        let client = connect(url)
        this.prefix = prefix;
        this.uuid = uuid;
        client.on('connect', this.connected)
        client.on('error', this.error)
        client.on('message', (topic: any, payload: any) => {
            this.message(topic, payload)
        })
        this.client = client;
    }
    message(topic: string, payload: Buffer) {
        let r = this.decode(payload)
        if (r.all || (r.uuid == this.uuid)) {
            this.fire(topic.replace(this.prefix, ''), {
                data: r.data,
                uuid: r.uuid,
                all: r.all,
                topic
            })
        }
    }
    connected() { }
    error() { }
    publish(topic: string, data: any, all: boolean = false) {
        this.client.publish(this.prefix + topic, this.encode(data, all))
        this.fire(MqttEvent.PUBLISHED, {
            topic, data, all
        })
    }
    encode(data: any, all: boolean): Buffer {
        let r = {
            all,
            data,
            uuid: this.uuid,
            type: 0,
        }
        if ("string" == typeof data) {
            r.type = DataType.String
            r.data = Buffer.alloc(data.length, data)
        } else if (data instanceof Buffer) {
            r.type = DataType.Buffer
        } else if ('boolean' == typeof data) {
            r.type = DataType.Boolean
            r.data = Buffer.alloc(1, data ? '1' : '0')
        } else if ('number' == typeof data) {
            r.type = DataType.Number
            r.data = Buffer.alloc(data.toString().length, data.toString())
        } else if ('object' == typeof data) {
            r.type = DataType.Object;
            let d = JSON.stringify(data)
            r.data = Buffer.alloc(d.length, d)
        }
        //是否全局广播，数据类型标记(0Buffer,1String,2Number,3Object,4Boolean,5Event)，
        let d = Buffer.alloc(r.data.length + r.uuid.length + 3)
        Buffer.alloc(3 + r.uuid.length, `${r.all ? 1 : 0}${r.type}${r.uuid}|`).copy(d, 0)
        r.data.copy(d, 3 + r.uuid.length)
        return d;
    }
    decode(data: Buffer): {
        all: boolean,
        uuid: string,
        data: any,
        type: DataType
    } {
        let rs = {
            all: false,
            uuid: '',
            data: null,
            type: 0
        }
        let str = data.toString()
        let splitPos = str.indexOf('|')
        rs.all = Number(str.substr(0, 1)) == 1
        rs.type = Number(str.substr(1, 1))
        rs.uuid = data.toString().substr(2, splitPos - 2)
        if (rs.type == DataType.Buffer) {
            rs.data = data.subarray(splitPos + 1)
        } else if (rs.type == DataType.String) {
            rs.data = data.toString().substr(splitPos + 1)
        } else if (rs.type == DataType.Boolean) {
            rs.data = data.toString().substr(splitPos + 1) == '1'
        } else if (rs.type == DataType.Number) {
            rs.data = Number(str.substr(splitPos + 1))
        } else if (rs.type == DataType.Object) {
            rs.data = JSON.parse(str.substr(splitPos + 1))
        }
        return rs;
    }
    subscribe(topic: string | string[], type: number, cb: (data: { all?: boolean, topic?: string, data?: any, uuid?: string }) => void) {
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
        if ('string' == typeof e) {
            Object.keys(this.cb).forEach((rule: string) => {
                if (match(e, rule)) {
                    this.cb[rule].forEach(s => {
                        if (s instanceof Function) {
                            s(data)
                        }
                    });
                }
            })
        } else {
            if (this.cb[e]) {
                this.cb[e].forEach(s => {
                    if (s instanceof Function) {
                        s(data)
                    }
                });
            }
        }
    }
    on(e: MqttEvent | string, cb: (data: { all?: boolean, topic?: string, data?: any, uuid?: string }) => void) {
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
function match(topic: string, rule: string) {
    let exp = rule
    switch (rule.substr(rule.length - 2)) {
        case '#':
            exp = rule.replace('#', '[A-Za-z0-9/]+')
            break;
        case '+':
            exp = rule.replace('+', '[A-Za-z0-9]+')
            break;
    }
    return new RegExp(exp).test(topic)
}