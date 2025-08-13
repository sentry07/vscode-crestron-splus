import * as assert from 'assert';
import * as vscode from 'vscode';


suite('default Settings', function () {
    const settingsToTest = [{
        uri: 'simplDirectory',
        defaultValue: 'C:\\Program Files (x86)\\Crestron\\Simpl'
    }, {
        uri: 'enable2series',
        defaultValue: false
    }, {
        uri: 'enable3series',
        defaultValue: true
    }, {
        uri: 'enable4series',
        defaultValue: true
    }];
    const configurationSplus = vscode.workspace.getConfiguration('simpl-plus');
    settingsToTest.forEach(function (setting) {
        test(`${setting.uri} has been added with default value ${setting.defaultValue}`, function () {
            var exists = configurationSplus.has(setting.uri);
            assert.ok(exists);
            var value = configurationSplus.get(setting.uri);
            assert.strictEqual(value, setting.defaultValue);
        });
    });
});
