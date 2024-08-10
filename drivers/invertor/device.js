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
const DEFAULT_RETRY_INTERVAL = 28;
class MySolaredgeDevice extends solaredge_1.Solaredge {
    /**
     * onInit is called when the device is initialized.
     */
    async onInit() {
        this.log('MySolaredgeDevice has been initialized');
        let name = this.getData().id;
        this.log("device name id " + name);
        this.log("device name " + this.getName());
        this.pollInvertor();
        let settings = this.getSettings();
        if (settings.pollinginterval === undefined) {
            this.setSettings({ pollinginterval: DEFAULT_RETRY_INTERVAL });
            settings.pollinginterval = 28;
        }
        this.timer = this.homey.setInterval(() => {
            // poll device state from inverter
            this.pollInvertor();
        }, settings.pollinginterval * 1000);
        // homey menu / device actions
        this.registerCapabilityListener('activepowerlimit', async (value) => {
            this.updateControl('activepowerlimit', Number(value), this);
            return value;
        });
        // this.registerCapabilityListener('limitcontrolmode', async (value) => {
        //   this.updateControl('limitcontrolmode', Number(value));
        //   return value;
        // });
        let controlActionActivePower = this.homey.flow.getActionCard('activepowerlimit');
        controlActionActivePower.registerRunListener(async (args, state) => {
            // let name = this.getData().id;
            // this.log("device name id " + name );
            // this.log("device name " + this.getName());
            this.log(args.device.getName());
            this.log(args.device.getSettings());
            await this.updateControl('activepowerlimit', Number(args.value), args.device);
        });
        let controlpowerreduce = this.homey.flow.getActionCard('powerreduce');
        controlpowerreduce.registerRunListener(async (args, state) => {
            // let name = this.getData().id;
            // this.log("device name id " + name );
            // this.log("device name " + this.getName());
            this.log(args.device.getName());
            this.log(args.device.getSettings());
            await this.updateControl('powerreduce', Number(args.value), args.device);
        });
        // flow conditions
        let changedStatus = this.homey.flow.getConditionCard("changedStatus");
        changedStatus.registerRunListener(async (args, state) => {
            let result = (await this.getCapabilityValue('invertorstatus') == args.argument_main);
            return Promise.resolve(result);
        });
        let solarcharge = this.homey.flow.getConditionCard("solarcharge");
        solarcharge.registerRunListener(async (args, state) => {
            let result = (await this.getCapabilityValue('measure_power') >= args.charging);
            return Promise.resolve(result);
        });
        // if (this.hasCapability('measure_voltage.phase1') === false) {
        //   await this.addCapability('measure_voltage.phase1');
        // }
        // if (this.hasCapability('measure_voltage.phase2') === false) {
        //   await this.addCapability('measure_voltage.phase2');
        // }
        // if (this.hasCapability('measure_voltage.phase3') === false) {
        //   await this.addCapability('measure_voltage.phase3');
        // } 
        // if (this.hasCapability('measure_voltage.phase1n') === false) {
        //   await this.addCapability('measure_voltage.phase1n');
        // }
        // if (this.hasCapability('measure_voltage.phase2n') === false) {
        //   await this.addCapability('measure_voltage.phase2n');
        // }
        // if (this.hasCapability('measure_voltage.phase3n') === false) {
        //   await this.addCapability('measure_voltage.phase3n');
        // } 
        if (this.hasCapability('powerreduce') === false) {
            await this.addCapability('powerreduce');
        }
    }
    /**
     * onAdded is called when the user adds the device, called just after pairing.
     */
    async onAdded() {
        this.log('MySolaredgeDevice has been added');
    }
    /**
     * onSettings is called when the user updates the device's settings.
     * @param {object} event the onSettings event data
     * @param {object} event.oldSettings The old settings object
     * @param {object} event.newSettings The new settings object
     * @param {string[]} event.changedKeys An array of keys changed since the previous version
     * @returns {Promise<string|void>} return a custom message that will be displayed
     */
    async onSettings({ oldSettings, newSettings, changedKeys, }) {
        this.log('MySolaredgeDevice settings where changed');
        if (changedKeys.indexOf('pollinginterval') > -1) {
            console.log('Changing the "pollinginterval" settings from', oldSettings.pollinginterval, 'to', newSettings.pollinginterval);
            this.homey.clearInterval(this.timer);
            this.timer = this.homey.setInterval(() => {
                // poll device state from inverter
                this.pollInvertor();
            }, Number(newSettings.pollinginterval) * 1000);
        }
    }
    /**
     * onRenamed is called when the user updates the device's name.
     * This method can be used this to synchronise the name to the device.
     * @param {string} name The new name
     */
    async onRenamed(name) {
        this.log('MySolaredgeDevice was renamed');
    }
    /**
     * onDeleted is called when the user deleted the device.
     */
    async onDeleted() {
        this.log('MySolaredgeDevice has been deleted');
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
            'timeout': device.getSetting('pollinginterval') - 1,
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
            if (type == 'activepowerlimit') {
                const activepowerlimitRes = await client.writeSingleRegister(0xf001, Number(value));
                console.log('activepowerlimit', activepowerlimitRes);
            }
            if (type == 'powerreduce') {
                let buffer;
                buffer = Buffer.allocUnsafe(4);
                buffer.writeFloatBE(value);
                buffer.swap32().swap16();
                let bytes = buffer.toString('hex').toUpperCase().replace(/(.{2})/g, "$1 ").trimEnd();
                console.log("Write register: Bytes: " + bytes);
                const powerreduceRes = await client.writeMultipleRegisters(0xf140, buffer);
                console.log('powerreduce', powerreduceRes);
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
                var dischargehex1 = 16384;
                var dischargehex2 = 17820;
                if (value == 0) {
                    dischargehex1 = 0;
                    dischargehex2 = 0;
                }
                else if (value == 50) {
                    dischargehex1 = 0;
                    dischargehex2 = 16968;
                }
                else if (value == 100) {
                    dischargehex1 = 0;
                    dischargehex2 = 17096;
                }
                else if (value == 150) {
                    dischargehex1 = 0;
                    dischargehex2 = 17174;
                }
                else if (value == 200) {
                    dischargehex1 = 0;
                    dischargehex2 = 17224;
                }
                else if (value == 300) {
                    dischargehex1 = 0;
                    dischargehex2 = 17302;
                }
                else if (value == 400) {
                    dischargehex1 = 0;
                    dischargehex2 = 17352;
                }
                else if (value == 500) {
                    dischargehex1 = 0;
                    dischargehex2 = 17402;
                }
                else if (value == 1000) {
                    dischargehex1 = 0;
                    dischargehex2 = 17530;
                }
                else if (value == 1500) {
                    dischargehex1 = 32768;
                    dischargehex2 = 17595;
                }
                else if (value == 2000) {
                    dischargehex1 = 0;
                    dischargehex2 = 17658;
                }
                else if (value == 2500) {
                    dischargehex1 = 16384;
                    dischargehex2 = 17692;
                }
                else if (value == 3000) {
                    dischargehex1 = 32768;
                    dischargehex2 = 17723;
                }
                else if (value == 4000) {
                    dischargehex1 = 0;
                    dischargehex2 = 17786;
                }
                else if (value == 5000) {
                    dischargehex1 = 16384;
                    dischargehex2 = 17820;
                }
                else if (value == 6600) {
                    dischargehex1 = 16384;
                    dischargehex2 = 17870;
                }
                const limitcontrolWattRes = await client.writeMultipleRegisters(0xe002, [dischargehex1, dischargehex2]);
                console.log('limitcontrolwatt', limitcontrolWattRes);
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
            'timeout': this.getSetting('pollinginterval') - 1,
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
        socket.on('connect', async () => {
            console.log('Connected ...');
            console.log(modbusOptions);
            const checkRegisterRes = await (0, response_1.checkRegister)(this.registers, client);
            console.log('disconnect');
            client.socket.end();
            socket.end();
            const finalRes = { ...checkRegisterRes };
            this.processResult(finalRes, this.getSetting('maxpeakpower'));
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
module.exports = MySolaredgeDevice;
