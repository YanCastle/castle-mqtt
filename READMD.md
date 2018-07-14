# mqtt
```
import Mqtt, { DataType } from ".";
const mqtt1 = new Mqtt('tcp://180.97.81.190:1883', 'tester/', 'mqtt1')
const mqtt2 = new Mqtt('tcp://180.97.81.190:1883', 'tester/', 'mqtt2')
const inter = {
    mqtt1: 0,
    mqtt2: 0
}
mqtt1.service('ping', (data) => {
    return data.a + inter.mqtt1++;
})
mqtt2.service('ping', (data) => {
    return data.a + inter.mqtt2++;
})
setInterval(() => {
    mqtt1.request('mqtt2', 'ping', { a: inter.mqtt1 }, (data) => {
        console.log(data)
    })
    mqtt2.request('mqtt1', 'ping', { a: inter.mqtt1 }, (data) => {
        console.log(data)
    })
}, 1000)
```