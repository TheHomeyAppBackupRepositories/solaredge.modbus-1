"use strict";
console.log('-------------------');
const modbus = require('jsmodbus');
const net = require('net');
const socket = new net.Socket();
let options = {
    'host': '176.61.80.108',
    'port': 502,
    'unitId': 1,
    'timeout': 6,
    'autoReconnect': false,
    'reconnectTimeout': 6,
    'logLabel': 'huawei solar Inverter',
    'logLevel': 'debug',
    'logEnabled': true
};
let client = new modbus.client.TCP(socket);
socket.connect(options);
socket.on('connect', () => {
    var delay = (function () {
        var timer = 0;
        return function (callback, ms) {
            clearTimeout(timer);
            timer = setTimeout(callback, ms);
        };
    })();
    console.log('Connected ...');
    registers = {
        "dummy": [0x7530, 1, 'STRING', "dummy"],
        "c_model": [0x7530, 16, 'STRING', "Model"],
        "c_version": [0x7576, 1, 'UINT16', "Version"],
        "c_serialnumber": [0x753F, 10, 'STRING', "Serial"],
        "pn": [0x7549, 10, 'STRING', "PN"],
        "grid_voltage": [0x7D42, 1, 'UINT16', "grid voltage"], // V factor 10
        // "c_deviceaddress":      [0x9c84, 1,  'UINT16', "Modbus ID"],
        // "c_sunspec_did":        [0x9c85, 1,  'UINT16', "SunSpec DID"],
        // "current":              [0x9c87, 1, 'UINT16', "Current"],
        // "l1_current":           [0x9c88, 1, 'UINT16', "L1 Current"],
        // "l2_current":           [0x9c89, 1, 'UINT16', "L2 Current"],
        // "l3_current":           [0x9c8a, 1, 'UINT16', "L3 Current"],
        // "current_scale":        [0x9c8b, 1, 'SCALE', "Current Scale Factor"],
        // "l1_voltage":           [0x9c8c, 1, 'UINT16', "L1 Voltage"],
        // "l2_voltage":           [0x9c8d, 1, 'UINT16', "L2 Voltage"],
        // "l3_voltage":           [0x9c8e, 1, 'UINT16', "L3 Voltage"],
        // "l1n_voltage":          [0x9c8f, 1, 'UINT16', "L1-N Voltage"],
        // "l2n_voltage":          [0x9c90, 1, 'UINT16', "L2-N Voltage"],
        // "l3n_voltage":          [0x9c91, 1, 'UINT16', "L3-N Voltage"],
        // "voltage_scale":        [0x9c92, 1, 'SCALE', "Voltage Scale Factor"],
        // "power_ac":             [0x9c93, 1, 'INT16', "Power"],
        // "power_ac_scale":       [0x9c94, 1, 'SCALE', "Power Scale Factor"],
        // "frequency":            [0x9c95, 1, 'UINT16', "Frequency"],
        // "frequency_scale":      [0x9c96, 1, 'SCALE', "Frequency Scale Factor"],
        // "power_apparent":       [0x9c97, 1, 'INT16', "Power [Apparent]"],
        // "power_apparent_scale": [0x9c98, 1, 'SCALE', "Power [Apparent] Scale Factor"],
        // "power_reactive":       [0x9c99, 1, 'INT16', "Power [Reactive]"],
        // "power_reactive_scale": [0x9c9a, 1, 'SCALE', "Power [Reactive] Scale Factor"],
        // "power_factor":         [0x9c9b, 1, 'INT16', "Power Factor"],
        // "power_factor_scale":   [0x9c9c, 1, 'SCALE', "Power Factor Scale Factor"],
        // "energy_total":         [0x9c9d, 2, 'ACC32', "Total Energy"],
        // "energy_total_scale":   [0x9c9f, 1, 'SCALE', "Total Energy Scale Factor"],
        // "current_dc":           [0x9ca0, 1, 'UINT16', "DC Current"],
        // "current_dc_scale":     [0x9ca1, 1, 'SCALE', "DC Current Scale Factor"],
        // "voltage_dc":           [0x9ca2, 1, 'UINT16', "DC Voltage"],
        // "voltage_dc_scale":     [0x9ca3, 1, 'SCALE', "DC Voltage Scale Factor"],
        // "power_dc":             [0x9ca4, 1, 'INT16', "DC Power"],
        // "power_dc_scale":       [0x9ca5, 1, 'SCALE', "DC Power Scale Factor"],
        // "temperature":          [0x9ca7, 1, 'INT16', "Temperature"],
        // "temperature_scale":    [0x9caa, 1, 'SCALE', "Temperature Scale Factor"],
        // "status":               [0x9cab, 1, 'UINT16', "Status"],
        // "vendor_status":        [0x9cac, 1, 'UINT16', "Vendor Status"],
        // "rrcr_state":           [0xf000, 1, 'UINT16', "RRCR State"],
        // "active_power_limit":   [0xf001, 1, 'UINT16', "Active Power Limit"],
        // "cosphi":               [0xf002, 2, 'FLOAT32', "CosPhi"],
        // "storage_control_mode":                   [0xe004, 1, 'UINT16', "Storage Control Mode"],
        // "storage_accharge_policy":                [0xe005, 1, 'UINT16', "Storage AC Charge Policy"],
        // "storage_accharge_Limit":                 [0xe006, 2, 'FLOAT32', "Storage AC Charge Limit"],
        // "remote_control_command_mode":            [0xe00d, 1, 'UINT16', "Remote Control Command Mode"],
        // "remote_control_charge_limit":            [0xe00e, 2, 'FLOAT32', "Remote Control Charge Limit"],
        // "remote_control_command_discharge_limit": [0xe010, 2, 'FLOAT32', "Remote Control Command Discharge Limit"]
    };
    for (const [key, value] of Object.entries(registers)) {
        // console.log(key, value);
        // start normale poll
        client.readHoldingRegisters(value[0], value[1])
            .then(function (resp) {
            // console.log(resp.response._body);
            if (value[2] == 'UINT16') {
                console.log(value[3] + ": " + resp.response._body._valuesAsBuffer.readInt16BE());
            }
            else if (value[2] == 'ACC32') {
                console.log(value[3] + ": " + resp.response._body._valuesAsBuffer.readUInt32BE());
            }
            else if (value[2] == 'FLOAT') {
                console.log(value[3] + ": " + resp.response._body._valuesAsBuffer.readFloatBE());
            }
            else if (value[2] == 'STRING') {
                console.log(value[3] + ": " + Buffer.from(resp.response._body._valuesAsBuffer, 'hex').toString());
            }
            else if (value[2] == 'INT16' || value[2] == 'SCALE') {
                console.log(value[3] + ": " + resp.response._body._valuesAsBuffer.readInt16BE());
            }
            else if (value[2] == 'FLOAT32') {
                console.log(value[3] + ": " + Buffer.from(resp.response._body._valuesAsBuffer, 'hex').swap16().swap32().readFloatBE());
            }
            else {
                console.log(key + ": type not found " + value[2]);
            }
        })
            .catch((err) => {
            console.log(err);
        });
    }
    delay(function () {
        socket.end();
    }, 8000);
});
//avoid all the crash reports
socket.on('error', (err) => {
    console.log(err);
    socket.end();
});
