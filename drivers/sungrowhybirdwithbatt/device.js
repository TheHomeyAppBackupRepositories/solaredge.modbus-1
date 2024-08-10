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
const sungrow_1 = require("../sungrow");
const RETRY_INTERVAL = 28 * 1000;
class MyWSungrowDevice extends sungrow_1.Sungrow {
    /**
     * onInit is called when the device is initialized.
     */
    async onInit() {
        this.log('MyWSungrowDevice has been initialized');
        let name = this.getData().id;
        this.log("device name id " + name);
        this.log("device name " + this.getName());
        this.pollInvertor();
        this.timer = this.homey.setInterval(() => {
            // poll device state from inverter
            this.pollInvertor();
        }, RETRY_INTERVAL);
        // flow action 
        let emsmodedAction = this.homey.flow.getActionCard('emsmodeselection');
        emsmodedAction.registerRunListener(async (args, state) => {
            await this.updateControl('emsmodeselection', Number(args.mode));
        });
        let exportEnabledAction = this.homey.flow.getActionCard('export');
        exportEnabledAction.registerRunListener(async (args, state) => {
            await this.updateControl2('export', Number(args.limitation), Number(args.power));
        });
        let chargeAction = this.homey.flow.getActionCard('charge');
        chargeAction.registerRunListener(async (args, state) => {
            await this.updateControl2('charge', Number(args.command), Number(args.power));
        });
        // homey menu / device actions
        this.registerCapabilityListener('emsmodeselection', async (value) => {
            this.updateControl('emsmodeselection', Number(value));
            return value;
        });
    }
    async updateControl(type, value) {
        let socket = new net_1.default.Socket();
        var unitID = this.getSetting('id');
        let client = new Modbus.client.TCP(socket, unitID);
        let modbusOptions = {
            'host': this.getSetting('address'),
            'port': this.getSetting('port'),
            'unitId': this.getSetting('id'),
            'timeout': 22,
            'autoReconnect': false,
            'logLabel': 'sungrow Inverter',
            'logLevel': 'error',
            'logEnabled': true
        };
        socket.setKeepAlive(false);
        socket.connect(modbusOptions);
        console.log(modbusOptions);
        socket.on('connect', async () => {
            console.log('Connected ...');
            if (type == 'emsmodeselection') {
                // 0 – Self-consumption mode
                // 2 – Forced mode (charge/discharge/stop)
                // 3 - External EMS mode
                const emsmodeselectionRes = await client.writeSingleRegister(13049, value);
                console.log('emsmodeselection', emsmodeselectionRes);
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
    async updateControl2(type, command, value) {
        let socket = new net_1.default.Socket();
        var unitID = this.getSetting('id');
        let client = new Modbus.client.TCP(socket, unitID);
        let modbusOptions = {
            'host': this.getSetting('address'),
            'port': this.getSetting('port'),
            'unitId': this.getSetting('id'),
            'timeout': 22,
            'autoReconnect': false,
            'logLabel': 'sungrow Inverter',
            'logLevel': 'error',
            'logEnabled': true
        };
        socket.setKeepAlive(false);
        socket.connect(modbusOptions);
        console.log(modbusOptions);
        socket.on('connect', async () => {
            console.log('Connected ...');
            if (type == 'export') {
                const exportLimitationRes = await client.writeSingleRegister(13086, command);
                console.log('exportLimitation', exportLimitationRes);
                const exportPowerRes = await client.writeSingleRegister(13073, value);
                console.log('exportPower', exportPowerRes);
            }
            if (type == 'charge') {
                const chargeCommandRes = await client.writeSingleRegister(13050, command);
                console.log('chargeCommand', chargeCommandRes);
                const chargePowerRes = await client.writeSingleRegister(13051, value);
                console.log('chargePower', chargePowerRes);
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
    /**
     * onAdded is called when the user adds the device, called just after pairing.
     */
    async onAdded() {
        this.log('MyWSungrowDevice has been added');
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
        this.log('MyWSungrowDevice settings where changed');
    }
    /**
     * onRenamed is called when the user updates the device's name.
     * This method can be used this to synchronise the name to the device.
     * @param {string} name The new name
     */
    async onRenamed(name) {
        this.log('MyWSungrowDevice was renamed');
    }
    /**
     * onDeleted is called when the user deleted the device.
     */
    async onDeleted() {
        this.log('MyWSungrowDevice has been deleted');
        this.homey.clearInterval(this.timer);
    }
    async pollInvertor() {
        this.log("pollInvertor");
        this.log(this.getSetting('address'));
        let modbusOptions = {
            'host': this.getSetting('address'),
            'port': this.getSetting('port'),
            'unitId': this.getSetting('id'),
            'timeout': 22,
            'autoReconnect': false,
            'logLabel': 'sungrow Inverter',
            'logLevel': 'error',
            'logEnabled': true
        };
        let socket = new net_1.default.Socket();
        var unitID = this.getSetting('id');
        let client = new Modbus.client.TCP(socket, unitID, 1000);
        socket.setKeepAlive(false);
        socket.connect(modbusOptions);
        socket.on('connect', async () => {
            console.log('Connected ...');
            console.log(modbusOptions);
            const checkRegisterRes = await (0, response_1.checkRegisterSungrow)(this.inputRegisters, client);
            const checkHoldingRegisterRes = await (0, response_1.checkHoldingRegisterSungrow)(this.holdingRegisters, client);
            console.log('disconnect');
            client.socket.end();
            socket.end();
            const finalRes = { ...checkRegisterRes, ...checkHoldingRegisterRes };
            this.processResult(finalRes);
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
module.exports = MyWSungrowDevice;
