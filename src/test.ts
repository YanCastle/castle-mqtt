import { DataType } from ".";
const uuid = 'abc'
function encode(data: any, all: boolean): Buffer {
    let r = {
        all,
        data,
        uuid: uuid,
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
function decode(data: Buffer): {
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
let r = encode(12345, true)
let d = decode(r)
let r1 = encode(true, true)
let d1 = decode(r1)
let r2 = encode('fwe', true)
let d2 = decode(r2)
let r3 = encode({ a: 1 }, true)
let d3 = decode(r3)
console.log(true)