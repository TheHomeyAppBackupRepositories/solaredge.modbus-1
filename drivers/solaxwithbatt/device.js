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
const solax_1 = require("../solax");
const RETRY_INTERVAL = 30 * 1000;
class MySolaxDevice extends solax_1.Solax {
    /**
     * onInit is called when the device is initialized.
     */
    async onInit() {
        this.log('MySolaxDevice has been initialized');
        let name = this.getData().id;
        this.log("device name id " + name);
        this.log("device name " + this.getName());
        this.pollInvertor();
        this.timer = this.homey.setInterval(() => {
            // poll device state from inverter
            this.pollInvertor();
        }, RETRY_INTERVAL);
        this.registerCapabilityListener('solarcharger_use_mode', async (value) => {
            this.updateControl('solarcharger_use_mode', Number(value), this);
            return value;
        });
        this.registerCapabilityListener('storage_force_charge_discharge2', async (value) => {
            this.updateControl('storage_force_charge_discharge', Number(value), this);
            return value;
        });
        let controlAction = this.homey.flow.getActionCard('solarcharger_use_mode');
        controlAction.registerRunListener(async (args, state) => {
            await this.updateControl('solarcharger_use_mode', Number(args.mode), args.device);
        });
        let customChargeAction = this.homey.flow.getActionCard('storage_force_charge_discharge');
        customChargeAction.registerRunListener(async (args, state) => {
            await this.updateControl('storage_force_charge_discharge', Number(args.mode), args.device);
        });
        let controlFeedinOnPowerAction = this.homey.flow.getActionCard('FeedinOnPower');
        controlFeedinOnPowerAction.registerRunListener(async (args, state) => {
            await this.updateControl('FeedinOnPower', Number(args.power), args.device);
        });
        let customCHardExportPowerAction = this.homey.flow.getActionCard('ExportcontrolUserLimit');
        customCHardExportPowerAction.registerRunListener(async (args, state) => {
            await this.updateControl('ExportcontrolUserLimit', Number(args.power), args.device);
        });
        let changedUsemode = this.homey.flow.getConditionCard("changedsolarcharger_use_mode");
        changedUsemode.registerRunListener(async (args, state) => {
            this.log('changedsolarcharger_use_mode  solarcharger_use_mode ' + this.getCapabilityValue('solarcharger_use_mode'));
            this.log('changedsolarcharger_use_mode  argument_main ' + args.argument_main);
            let result = (await this.getCapabilityValue('solarcharger_use_mode') == args.argument_main);
            return Promise.resolve(result);
        });
        let changedstorage_force_charge_discharge = this.homey.flow.getConditionCard("changedstorage_force_charge_discharge");
        changedstorage_force_charge_discharge.registerRunListener(async (args, state) => {
            this.log('changedstorage_force_charge_discharge  storage_force_charge_discharge2 ' + this.getCapabilityValue('storage_force_charge_discharge2'));
            this.log('changedstorage_force_charge_discharge  argument_main ' + args.argument_main);
            let result = (await this.getCapabilityValue('storage_force_charge_discharge2') == args.argument_main);
            return Promise.resolve(result);
        });
    }
    /**
     * onAdded is called when the user adds the device, called just after pairing.
     */
    async onAdded() {
        this.log('MySolaxDevice has been added');
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
        this.log('MySolaxDevice settings where changed');
    }
    /**
     * onRenamed is called when the user updates the device's name.
     * This method can be used this to synchronise the name to the device.
     * @param {string} name The new name
     */
    async onRenamed(name) {
        this.log('MySolaxDevice was renamed');
    }
    /**
     * onDeleted is called when the user deleted the device.
     */
    async onDeleted() {
        this.log('MySolaxDevice has been deleted');
        this.homey.clearInterval(this.timer);
    }
    async updateControl(type, value, device) {
        let name = device.getData().id;
        this.log("device name id " + name);
        this.log("device name " + device.getName());
        let socket = new net_1.default.Socket();
        var unitID = device.getSetting('id');
        let client = new Modbus.client.TCP(socket, unitID, 3500);
        let modbusOptions = {
            'host': device.getSetting('address'),
            'port': device.getSetting('port'),
            'unitId': device.getSetting('id'),
            'timeout': 15,
            'autoReconnect': false,
            'logLabel': 'solax Inverter',
            'logLevel': 'error',
            'logEnabled': true
        };
        socket.setKeepAlive(false);
        socket.connect(modbusOptions);
        console.log(modbusOptions);
        socket.on('connect', async () => {
            console.log('Connected ...');
            if (type == 'solarcharger_use_mode') {
                const solarcharger_use_modeRes = await client.writeSingleRegister(0x001F, value);
                console.log('solarcharger_use_mode', solarcharger_use_modeRes);
            }
            if (type == 'storage_force_charge_discharge') {
                const storage_forceRes = await client.writeSingleRegister(0x0020, value);
                console.log('storage_force_charge_discharge', storage_forceRes);
            }
            // 0x00B7 FeedinOnPower W 0~8000 1W uint16
            if (type == 'FeedinOnPower') {
                const FeedinOnPowerRes = await client.writeSingleRegister(0x00B7, value);
                console.log('FeedinOnPower', FeedinOnPowerRes);
            }
            // 0x0042 ExportcontrolUserLimit W
            // Export control User_Limit
            // (0~60000)
            // 1W uint16
            if (type == 'ExportcontrolUserLimit') {
                const ExportcontrolUserLimitRes = await client.writeSingleRegister(0x0042, value);
                console.log('ExportcontrolUserLimit', ExportcontrolUserLimitRes);
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
    async pollInvertor() {
        this.log("pollInvertor");
        this.log(this.getSetting('address'));
        let modbusOptions = {
            'host': this.getSetting('address'),
            'port': this.getSetting('port'),
            'unitId': this.getSetting('id'),
            'timeout': 29,
            'autoReconnect': false,
            'logLabel': 'solax Inverter',
            'logLevel': 'error',
            'logEnabled': true
        };
        let socket = new net_1.default.Socket();
        var unitID = this.getSetting('id');
        let client = new Modbus.client.TCP(socket, unitID, 2000);
        socket.setKeepAlive(false);
        socket.connect(modbusOptions);
        socket.on('connect', async () => {
            console.log('Connected ...');
            console.log(modbusOptions);
            const checkRegisterRes = await (0, response_1.checkinputRegisterSolax)(this.inputRegisters, client);
            const checkRegisterHoldingRes = await (0, response_1.checkholdingRegisterSolax)(this.holdingRegisters, client);
            console.log('disconnect');
            client.socket.end();
            socket.end();
            const finalRes = { ...checkRegisterRes, ...checkRegisterHoldingRes };
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
module.exports = MySolaxDevice;
