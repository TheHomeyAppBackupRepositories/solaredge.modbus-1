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
const solaredge_1 = require("../solaredge");
const response_1 = require("../response");
const response_2 = require("../response");
const response_3 = require("../response");
const RETRY_INTERVAL = 30 * 1000;
class MySolaredgeBatteryDevice extends solaredge_1.Solaredge {
    async onInit() {
        this.log('MySolaredgeBatteryDevice has been initialized');
        let name = this.getData().id;
        this.log("device name id " + name);
        this.log("device name " + this.getName());
        this.pollInvertor();
        this.timer = this.homey.setInterval(() => {
            // poll device state from inverter
            this.pollInvertor();
        }, RETRY_INTERVAL);
        // homey menu / device actions
        this.registerCapabilityListener('storagecontrolmode', async (value) => {
            this.updateControl('storagecontrolmode', Number(value), this);
            let tokens = {
                "mode": Number(value)
            };
            let state = {};
            console.log('trigger changedStoragecontrolmode ' + value);
            this.homey.flow.getDeviceTriggerCard('changedStoragecontrolmode').trigger(this, tokens, state);
            return value;
        });
        this.registerCapabilityListener('storageacchargepolicy', async (value) => {
            this.updateControl('storageacchargepolicy', Number(value), this);
            return value;
        });
        this.registerCapabilityListener('storagedefaultmode', async (value) => {
            this.updateControl('storagedefaultmode', Number(value), this);
            let tokens = {
                "mode": Number(value)
            };
            let state = {};
            console.log('trigger changedStoragedefaultmode ' + value);
            this.homey.flow.getDeviceTriggerCard('changedStoragedefaultmode').trigger(this, tokens, state);
            return value;
        });
        this.registerCapabilityListener('limitcontrolmode', async (value) => {
            this.updateControl('limitcontrolmode', Number(value), this);
            return value;
        });
        this.registerCapabilityListener('activepowerlimit', async (value) => {
            this.updateControl('activepowerlimit', Number(value), this);
            return value;
        });
        // flow action
        let controlActionActivePower = this.homey.flow.getActionCard('activepowerlimit');
        controlActionActivePower.registerRunListener(async (args, state) => {
            let name = this.getData().id;
            this.log("device name id " + name);
            this.log("device name " + this.getName());
            this.log(args.device.getName());
            await this.updateControl('activepowerlimit', Number(args.value), args.device);
        });
        let controlAction = this.homey.flow.getActionCard('storagecontrolmode');
        controlAction.registerRunListener(async (args, state) => {
            await this.updateControl('storagecontrolmode', Number(args.mode), args.device);
        });
        let customModeAction = this.homey.flow.getActionCard('storagedefaultmode');
        customModeAction.registerRunListener(async (args, state) => {
            await this.updateControl('storagedefaultmode', Number(args.mode), args.device);
        });
        let chargeLimitAction = this.homey.flow.getActionCard('setcharging');
        chargeLimitAction.registerRunListener(async (args, state) => {
            await this.updateControl('chargelimit', Number(args.chargepower), args.device);
        });
        let dischargeLimitAction = this.homey.flow.getActionCard('setdischarging');
        dischargeLimitAction.registerRunListener(async (args, state) => {
            await this.updateControl('dischargelimit', Number(args.dischargepower), args.device);
        });
        let limitControlModeAction = this.homey.flow.getActionCard('limitcontrolmode');
        limitControlModeAction.registerRunListener(async (args, state) => {
            await this.updateControl('limitcontrolmode', Number(args.mode), args.device);
        });
        let exportLimitAction = this.homey.flow.getActionCard('exportlimit');
        exportLimitAction.registerRunListener(async (args, state) => {
            await this.updateControl('exportlimit', Number(args.exportlimit), args.device);
        });
        // flow conditions
        let changedStatus = this.homey.flow.getConditionCard("changedStatus");
        changedStatus.registerRunListener(async (args, state) => {
            let result = (await this.getCapabilityValue('invertorstatus') == args.argument_main);
            return Promise.resolve(result);
        });
        let changedBatteryStatus = this.homey.flow.getConditionCard("changedBatteryStatus");
        changedBatteryStatus.registerRunListener(async (args, state) => {
            let result = (await this.getCapabilityValue('battstatus') == args.argument_main);
            return Promise.resolve(result);
        });
        let changedStoragedefaultmode = this.homey.flow.getConditionCard("changedStoragedefaultmode");
        changedStoragedefaultmode.registerRunListener(async (args, state) => {
            let result = (await this.getCapabilityValue('storagedefaultmode') == args.argument_main);
            return Promise.resolve(result);
        });
        let changedStoragecontrolmode = this.homey.flow.getConditionCard("changedStoragecontrolmode");
        changedStoragecontrolmode.registerRunListener(async (args, state) => {
            let result = (await this.getCapabilityValue('storagecontrolmode') == args.argument_main);
            return Promise.resolve(result);
        });
        let batterylevelStatus = this.homey.flow.getConditionCard("batterylevel");
        batterylevelStatus.registerRunListener(async (args, state) => {
            let result = (await this.getCapabilityValue('measure_battery') >= args.charged);
            return Promise.resolve(result);
        });
        let batterychargeStatus = this.homey.flow.getConditionCard("batterycharge");
        batterychargeStatus.registerRunListener(async (args, state) => {
            let result = (await this.getCapabilityValue('measure_power.batt_charge') >= args.charging);
            return Promise.resolve(result);
        });
        let batterydischargeStatus = this.homey.flow.getConditionCard("batterydischarge");
        batterydischargeStatus.registerRunListener(async (args, state) => {
            let result = (await this.getCapabilityValue('measure_power.batt_discharge') >= args.discharging);
            return Promise.resolve(result);
        });
        let solarbattchargeStatus = this.homey.flow.getConditionCard("solarbattcharge");
        solarbattchargeStatus.registerRunListener(async (args, state) => {
            let result = (await this.getCapabilityValue('measure_power') >= args.charging);
            return Promise.resolve(result);
        });
        let gridimportStatus = this.homey.flow.getConditionCard("gridimport");
        gridimportStatus.registerRunListener(async (args, state) => {
            let result = (await this.getCapabilityValue('measure_power.import') >= args.import);
            return Promise.resolve(result);
        });
        let gridexportStatus = this.homey.flow.getConditionCard("gridexport");
        gridexportStatus.registerRunListener(async (args, state) => {
            let result = (await this.getCapabilityValue('measure_power.export') >= args.export);
            return Promise.resolve(result);
        });
        if (this.hasCapability('measure_voltage.phase1') === false) {
            await this.addCapability('measure_voltage.phase1');
        }
        if (this.hasCapability('measure_voltage.phase2') === false) {
            await this.addCapability('measure_voltage.phase2');
        }
        if (this.hasCapability('measure_voltage.phase3') === false) {
            await this.addCapability('measure_voltage.phase3');
        }
        if (this.hasCapability('measure_voltage.meter_phase1') === false) {
            await this.addCapability('measure_voltage.meter_phase1');
        }
        if (this.hasCapability('measure_voltage.meter_phase2') === false) {
            await this.addCapability('measure_voltage.meter_phase2');
        }
        if (this.hasCapability('measure_voltage.meter_phase3') === false) {
            await this.addCapability('measure_voltage.meter_phase3');
        }
    }
    /**
     * onAdded is called when the user adds the device, called just after pairing.
     */
    async onAdded() {
        this.log('MySolaredgeBatteryDevice has been added');
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
        this.log('MySolaredgeBatteryDevice settings where changed');
    }
    /**
     * onRenamed is called when the user updates the device's name.
     * This method can be used this to synchronise the name to the device.
     * @param {string} name The new name
     */
    async onRenamed(name) {
        this.log('MySolaredgeBatteryDevice was renamed');
    }
    /**
     * onDeleted is called when the user deleted the device.
     */
    async onDeleted() {
        this.log('MySolaredgeBatteryDevice has been deleted');
        this.homey.clearInterval(this.timer);
    }
    async updateControl(type, value, device) {
        let name = device.getData().id;
        this.log("device name id " + name);
        this.log("device name " + device.getName());
        let socket = new net_1.default.Socket();
        var unitID = device.getSetting('id');
        let client = new Modbus.client.TCP(socket, unitID);
        let modbusOptions = {
            'host': device.getSetting('address'),
            'port': device.getSetting('port'),
            'unitId': device.getSetting('id'),
            'timeout': 15,
            'autoReconnect': false,
            'logLabel': 'solaredge Inverter',
            'logLevel': 'error',
            'logEnabled': true
        };
        socket.setKeepAlive(false);
        socket.connect(modbusOptions);
        console.log(modbusOptions);
        socket.on('connect', async () => {
            // https://babbage.cs.qc.cuny.edu/ieee-754.old/Decimal.html
            // https://www.rapidtables.com/convert/number/hex-to-decimal.html
            console.log('Connected ...');
            if (type == 'chargelimit') {
                let buffer;
                buffer = Buffer.allocUnsafe(4);
                buffer.writeFloatBE(value);
                buffer.swap32().swap16();
                let bytes = buffer.toString('hex').toUpperCase().replace(/(.{2})/g, "$1 ").trimEnd();
                console.log("Write register: Bytes: " + bytes);
                const chargeRes = await client.writeMultipleRegisters(0xe00e, buffer);
                console.log('charge', chargeRes);
            }
            if (type == 'dischargelimit') {
                let buffer;
                buffer = Buffer.allocUnsafe(4);
                buffer.writeFloatBE(value);
                buffer.swap32().swap16();
                let bytes = buffer.toString('hex').toUpperCase().replace(/(.{2})/g, "$1 ").trimEnd();
                console.log("Write register: Bytes: " + bytes);
                const dischargeRes = await client.writeMultipleRegisters(0xe010, buffer);
                console.log('discharge', dischargeRes);
            }
            if (type == 'activepowerlimit') {
                const activepowerlimitRes = await client.writeSingleRegister(0xf001, Number(value));
                console.log('activepowerlimit', activepowerlimitRes);
            }
            if (type == 'limitcontrolmode') {
                // 0 – Disabled
                // 1 – Export Control
                // 2 – Production Control
                // 11 – Minimum Import Control
                if (value == 1) {
                    const limitcontrolmodeeRes = await client.writeSingleRegister(0xe000, Number(1));
                    console.log('limitcontrolmode', limitcontrolmodeeRes);
                    // side = 0
                    const limitcontrolsideRes = await client.writeSingleRegister(0xe001, Number(0));
                    console.log('limitcontrolside', limitcontrolsideRes);
                    // 3000
                    const limitcontrolWattRes = await client.writeMultipleRegisters(0xe002, [32768, 17723]);
                    console.log('limitcontrolwatt', limitcontrolWattRes);
                }
                else if (value == 2) {
                    const limitcontrolmodeeRes = await client.writeSingleRegister(0xe000, Number(4));
                    console.log('limitcontrolmode', limitcontrolmodeeRes);
                    // 500
                    const limitcontrolWattRes = await client.writeMultipleRegisters(0xe002, [0, 17402]);
                    console.log('limitcontrolwatt', limitcontrolWattRes);
                }
                else if (value == 11) {
                    const limitcontrolmodeeRes = await client.writeSingleRegister(0xe000, Number(2049));
                    console.log('limitcontrolmode', limitcontrolmodeeRes);
                    // 500
                    const limitcontrolWattRes = await client.writeMultipleRegisters(0xe002, [0, 17402]);
                    console.log('limitcontrolwatt', limitcontrolWattRes);
                }
                else {
                    const limitcontrolmodeeRes = await client.writeSingleRegister(0xe000, Number(0));
                    console.log('limitcontrolmode', limitcontrolmodeeRes);
                }
            }
            if (type == 'exportlimit') {
                // https://babbage.cs.qc.cuny.edu/ieee-754.old/Decimal.html
                // https://www.rapidtables.com/convert/number/hex-to-decimal.html
                let buffer;
                buffer = Buffer.allocUnsafe(4);
                buffer.writeFloatBE(value);
                buffer.swap32().swap16();
                let bytes = buffer.toString('hex').toUpperCase().replace(/(.{2})/g, "$1 ").trimEnd();
                console.log("Write register: Bytes: " + bytes);
                const limitcontrolWattRes = await client.writeMultipleRegisters(0xe002, buffer);
                console.log('limitcontrolwatt', limitcontrolWattRes);
            }
            if (type == 'storagecontrolmode') {
                // 0 – Disabled
                // 1 – Maximize Self Consumption – requires a SolarEdge Electricity meter on the grid or load connection point
                // 2 – Time of Use (Profile programming) – requires a SolarEdge Electricity meter on the grid or load connection point 3 – Backup Only (applicable only for systems support backup functionality)
                // 4 – Remote Control – the battery charge/discharge state is controlled by an external controller
                const storagecontrolmodeRes = await client.writeSingleRegister(0xe004, Number(value));
                console.log('controlmodewrite', storagecontrolmodeRes);
            }
            if (type == 'storageacchargepolicy') {
                // 0 – Disable
                // 1 – Always allowed – needed for AC coupling operation. Allows unlimited charging from the AC. When used with Maximize self-consumption, only excess power is used for charging (charging from the grid is not allowed).
                // 2 – Fixed Energy Limit – allows AC charging with a fixed yearly (Jan 1 to Dec 31) limit (needed for meeting ITC regulation in the US)
                // 3 – Percent of Production - allows AC charging with a % of system production year to date limit (needed for meeting ITC regulation in the US)
                const storageacchargepolicyRes = await client.writeSingleRegister(0xe005, Number(value));
                console.log('storageacchargepolicy', storageacchargepolicyRes);
            }
            if (type == 'storagedefaultmode') {
                const storagedefaultmodeRes = await client.writeSingleRegister(0xe004, Number(4));
                console.log('controlmodewrite', storagedefaultmodeRes);
                // set timeout to 6 hours, done in seconds
                const remoteTimeout = await client.writeMultipleRegisters(0xe00b, [Number(21600), 0]);
                console.log('remote_control_command_timeout', remoteTimeout);
                // 0 – Off
                // 1 – Charge excess PV power only.
                // Only PV excess power not going to AC is used for charging the battery. Inverter NominalActivePowerLimit (or the inverter rated power whichever is lower) sets how much power the inverter is producing to the AC. In this mode, the battery cannot be discharged. If the PV power is lower than NominalActivePowerLimit the AC production will be equal to the PV power.
                // 2 – Charge from PV first, before producing power to the AC.
                // The Battery charge has higher priority than AC production. First charge the battery then produce AC.
                // If StorageRemoteCtrl_ChargeLimit is lower than PV excess power goes to AC according to NominalActivePowerLimit. If NominalActivePowerLimit is reached and battery StorageRemoteCtrl_ChargeLimit is reached, PV power is curtailed.
                // 3 – Charge from PV+AC according to the max battery power.
                // Charge from both PV and AC with priority on PV power.
                // If PV production is lower than StorageRemoteCtrl_ChargeLimit, the battery will be charged from AC up to NominalActivePow-erLimit. In this case AC power = StorageRemoteCtrl_ChargeLimit- PVpower.
                // If PV power is larger than StorageRemoteCtrl_ChargeLimit the excess PV power will be directed to the AC up to the Nominal-ActivePowerLimit beyond which the PV is curtailed.
                // 4 – Maximize export – discharge battery to meet max inverter AC limit.
                // AC power is maintained to NominalActivePowerLimit, using PV power and/or battery power. If the PV power is not sufficient, battery power is used to complement AC power up to StorageRemoteCtrl_DishargeLimit. In this mode, charging excess power will occur if there is more PV than the AC limit.
                // 5 – Discharge to meet loads consumption. Discharging to the grid is not allowed. 
                // 7 – Maximize self-consumption
                const remotecontrolwrite = await client.writeSingleRegister(0xe00d, Number(value));
                console.log('remotecontrolwrite', remotecontrolwrite);
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
        function handleErrors(err) {
            console.log('Unknown Error', err);
        }
        function handleErrorsMeters(err) {
            console.log('No meter');
        }
        let modbusOptions = {
            'host': this.getSetting('address'),
            'port': this.getSetting('port'),
            'unitId': this.getSetting('id'),
            'timeout': 25,
            'autoReconnect': false,
            'logLabel': 'solaredge Inverter',
            'logLevel': 'error',
            'logEnabled': true
        };
        let socket = new net_1.default.Socket();
        var unitID = this.getSetting('id');
        let client = new Modbus.client.TCP(socket, unitID, 1000);
        socket.setKeepAlive(false);
        socket.connect(modbusOptions);
        console.log(modbusOptions);
        socket.on('connect', async () => {
            const startTime = new Date();
            console.log('Connected ...');
            const checkRegisterRes = await (0, response_1.checkRegister)(this.registers, client);
            const checkMeterRes = await (0, response_2.checkMeter)(this.meter_dids, this.meter_registers, client);
            const checkBatteryRes = await (0, response_3.checkBattery)(this.battery_dids, this.batt_registers, client);
            console.log('disconnect');
            client.socket.end();
            socket.end();
            const finalRes = { ...checkRegisterRes, ...checkMeterRes, ...checkBatteryRes };
            this.processResult(finalRes, this.getSetting('maxpeakpower'));
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
module.exports = MySolaredgeBatteryDevice;
