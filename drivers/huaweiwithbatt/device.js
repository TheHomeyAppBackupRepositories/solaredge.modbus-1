"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const Modbus = __importStar(require("jsmodbus"));
const net_1 = __importDefault(require("net"));
const response_1 = require("../response");
const huawei_1 = require("../huawei");
const RETRY_INTERVAL = 120 * 1000;
class MyHuaweiDeviceBattery extends huawei_1.Huawei {
    /**
     * onInit is called when the device is initialized.
     */
    async onInit() {
        this.log('MyHuaweiDevice has been initialized');
        let name = this.getData().id;
        this.log("device name id " + name);
        this.log("device name " + this.getName());
        this.pollInvertor();
        this.timer = this.homey.setInterval(() => {
            // poll device state from inverter
            this.pollInvertor();
        }, RETRY_INTERVAL);
        // homey menu / device actions
        this.registerCapabilityListener('storage_excess_pv_energy_use_in_tou', async (value) => {
            this.updateControl('storage_excess_pv_energy_use_in_tou', Number(value));
            return value;
        });
        this.registerCapabilityListener('storage_force_charge_discharge', async (value) => {
            this.updateControl('storage_force_charge_discharge', Number(value));
            return value;
        });
        this.registerCapabilityListener('activepower_controlmode', async (value) => {
            this.updateControl('activepower_controlmode', Number(value));
            return value;
        });
        this.registerCapabilityListener('remote_charge_discharge_control_mode', async (value) => {
            this.updateControl('remote_charge_discharge_control_mode', Number(value));
            return value;
        });
        this.registerCapabilityListener('storage_working_mode_settings', async (value) => {
            this.updateControl('storage_working_mode_settings', Number(value));
            return value;
        });
    }
    /**
     * onAdded is called when the user adds the device, called just after pairing.
     */
    async onAdded() {
        this.log('MyHuaweiDeviceBattery has been added');
    }
    /**
     * onSettings is called when the user updates the device's settings.
     * @param {object} event the onSettings event data
     * @param {object} event.oldSettings The old settings object
     * @param {object} event.newSettings The new settings object
     * @param {string[]} event.changedKeys An array of keys changed since the previous version
     * @returns {Promise<string|void>} return a custom message that will be displayed
     */
    async onSettings({ oldSettings: {}, newSettings: {}, changedKeys: {} }) {
        this.log('MyHuaweiDeviceBattery settings where changed');
    }
    /**
     * onRenamed is called when the user updates the device's name.
     * This method can be used this to synchronise the name to the device.
     * @param {string} name The new name
     */
    async onRenamed(name) {
        this.log('MyHuaweiDeviceBattery was renamed');
    }
    /**
     * onDeleted is called when the user deleted the device.
     */
    async onDeleted() {
        this.log('MyHuaweiDeviceBattery has been deleted');
        this.homey.clearInterval(this.timer);
    }
    async updateControl(type, value) {
        let socket = new net_1.default.Socket();
        var unitID = this.getSetting('id');
        let client = new Modbus.client.TCP(socket, unitID, 5500);
        let modbusOptions = {
            'host': this.getSetting('address'),
            'port': this.getSetting('port'),
            'unitId': this.getSetting('id'),
            'timeout': 45,
            'autoReconnect': false,
            'logLabel': 'huawei Inverter Battery',
            'logLevel': 'error',
            'logEnabled': true
        };
        socket.setKeepAlive(false);
        socket.connect(modbusOptions);
        console.log(modbusOptions);
        socket.on('connect', async () => {
            console.log('Connected ...');
            if (type == 'storage_excess_pv_energy_use_in_tou') {
                const storage_excess_pvRes = await client.writeSingleRegister(47299, value);
                console.log('storage_excess_pv_energy_use_in_tou', storage_excess_pvRes);
            }
            if (type == 'storage_force_charge_discharge') {
                const storage_forceRes = await client.writeSingleRegister(47100, value);
                console.log('storage_force_charge_discharge', storage_forceRes);
            }
            if (type == 'activepower_controlmode') {
                const activepowerRes = await client.writeSingleRegister(47415, value);
                console.log('activepower_controlmode', activepowerRes);
            }
            if (type == 'remote_charge_discharge_control_mode') {
                const controlmodeRes = await client.writeSingleRegister(47589, value);
                console.log('remote_charge_discharge_control_mode', controlmodeRes);
            }
            if (type == 'storage_working_mode_settings') {
                const storageworkingmodesettingsRes = await client.writeSingleRegister(47086, value);
                console.log('storage_working_mode_settings', storageworkingmodesettingsRes);
            }
            console.log('disconnect');
            client.socket.end();
            socket.end();
        });
        socket.on('close', () => {
            console.log('Client closed');
        });
        socket.on('error', (err) => {
            console.log(err);
            socket.end();
            setTimeout(() => socket.connect(modbusOptions), 4000);
        });
    }
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
    async pollInvertor() {
        this.log("pollInvertor");
        this.log(this.getSetting('address'));
        let modbusOptions = {
            'host': this.getSetting('address'),
            'port': this.getSetting('port'),
            'unitId': this.getSetting('id'),
            'timeout': 115,
            'autoReconnect': false,
            'logLabel': 'huawei Inverter Battery',
            'logLevel': 'error',
            'logEnabled': true
        };
        let socket = new net_1.default.Socket();
        var unitID = this.getSetting('id');
        let client = new Modbus.client.TCP(socket, unitID, 5500);
        socket.setKeepAlive(false);
        socket.connect(modbusOptions);
        socket.on('connect', async () => {
            console.log('Connected ...');
            console.log(modbusOptions);
            const startTime = new Date();
            await this.delay(5000);
            const checkRegisterRes = await (0, response_1.checkHoldingRegisterHuawei)(this.holdingRegisters, client);
            const checkBatteryRes = await (0, response_1.checkHoldingRegisterHuawei)(this.holdingRegistersBattery, client);
            const checkMetersRes = await (0, response_1.checkHoldingRegisterHuawei)(this.holdingRegistersMeters, client);
            console.log('disconnect');
            client.socket.end();
            socket.end();
            const finalRes = { ...checkRegisterRes, ...checkBatteryRes, ...checkMetersRes };
            this.processResult(finalRes);
            const endTime = new Date();
            const timeDiff = endTime.getTime() - startTime.getTime();
            let seconds = Math.floor(timeDiff / 1000);
            console.log("total time: " + seconds + " seconds");
        });
        socket.on('close', () => {
            console.log('Client closed');
        });
        socket.on('timeout', () => {
            console.log('socket timed out!');
            client.socket.end();
            socket.end();
        });
        socket.on('error', (err) => {
            console.log(err);
            client.socket.end();
            socket.end();
        });
    }
}
module.exports = MyHuaweiDeviceBattery;
