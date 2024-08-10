"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const homey_1 = __importDefault(require("homey"));
class MyGrowattTLBatteryDriver extends homey_1.default.Driver {
    /**
     * onInit is called when the driver is initialized.
     */
    async onInit() {
        this.log('MyGrowattTLBatteryDriver has been initialized');
    }
    /**
     * onPairListDevices is called when a user is adding a device and the 'list_devices' view is called.
     * This should return an array with the data of devices that are available for pairing.
     */
    async onPairListDevices() {
        return [
        // Example device data, note that `store` is optional
        // {
        //   name: 'My Device',
        //   data: {
        //     id: 'my-device',
        //   },
        //   store: {
        //     address: '127.0.0.1',
        //   },
        // },
        ];
    }
}
module.exports = MyGrowattTLBatteryDriver;
