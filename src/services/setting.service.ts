import { Injectable } from '@angular/core';
import { RadioButton, RadioButtonFactory } from '../components/setting/radiobutton/radiobutton';
import * as fs from 'fs';

let settingPath = '';
export function setSettingPath(path: string) {
    settingPath = path;
}

interface Setting {
    version: number;
}

interface SettingVer1 extends Setting {
    tokens: string[];
    hideButtons: boolean;
    imageExpansionSize: RadioButton;
}

function MigrateSettingEmptyToVer1(): SettingVer1 {
    let newSetting = {} as SettingVer1;

    newSetting.version = 1;
    newSetting.tokens = [];
    newSetting.hideButtons = false;
    newSetting.imageExpansionSize = RadioButtonFactory.get('Image Expansion', ['Normal', 'Small', 'Never'], 'Normal');

    return newSetting;
}

export interface Token {
    value: string;
    enabled: boolean;
}

interface SettingVer2 extends Setting {
    tokens: Token[];
    hideButtons: boolean;
    imageExpansionSize: RadioButton;
}

function MigrateSettingVer1ToVer2(oldSetting: SettingVer1): SettingVer2 {
    let newSetting: SettingVer2 = {} as SettingVer2;

    newSetting.version = 2;
    newSetting.tokens = [];
    for (const t of oldSetting.tokens) {
        newSetting.tokens.push({ value: t, enabled: true } as Token);
    }
    newSetting.hideButtons = oldSetting.hideButtons;
    if (oldSetting.imageExpansionSize !== undefined) {
        newSetting.imageExpansionSize = oldSetting.imageExpansionSize;
    } else {
        // SettingVer1 may not contain imageExpansionSize because there was no setting version control
        // when imageExpansionSize was added as a new setting item.
        newSetting.imageExpansionSize = RadioButtonFactory.get('Image Expansion', ['Normal', 'Small', 'Never'], 'Normal');
    }

    return newSetting;
}

const currentSettingVersion = 2;
type SettingCurrent = SettingVer2;

@Injectable()
export class SettingService {
    setting: SettingCurrent;
    settingMigrations: any[];

    get tokens(): Token[] {
        return this.setting.tokens;
    }

    set tokens(tokens: Token[]) {
        this.setting.tokens = tokens;
    }

    isTokenEnabled(token: string): boolean {
        return this.setting.tokens[this.setting.tokens.findIndex(t => t.value === token)].enabled;
    }

    get hideButtons(): boolean {
        return this.setting.hideButtons;
    }

    set hideButtons(hideButtons: boolean) {
        this.setting.hideButtons = hideButtons;
    }

    get imageExpansionSize(): RadioButton {
        return this.setting.imageExpansionSize;
    }

    set imageExpansionSize(imageExpansionSize: RadioButton) {
        this.setting.imageExpansionSize = imageExpansionSize;
    }

    constructor() {
        let loadedSetting: Setting;
        try {
            loadedSetting = JSON.parse(fs.readFileSync(settingPath, 'utf8'));
            // if setting.json exists but no version number is included, suppose it is version 1
            if (loadedSetting.version === undefined) {
                loadedSetting.version = 1;
            }
        } catch (e) {
            // if setting.json does not exist, it is version 0 (empty setting)
            loadedSetting = {} as Setting;
            loadedSetting.version = 0;
        }

        this.settingMigrations = [];
        this.settingMigrations.push(MigrateSettingEmptyToVer1);
        this.settingMigrations.push(MigrateSettingVer1ToVer2);

        let migrated = false;
        for (let v = loadedSetting.version; v < currentSettingVersion; v++) {
            migrated = true;
            loadedSetting = this.settingMigrations[v](loadedSetting);
        }
        this.setting = loadedSetting as SettingCurrent;

        // save if a migration is invoked
        if (migrated) {
            this.save();
        }
    }

    save() {
        fs.writeFileSync(settingPath, JSON.stringify(this.setting));
    }
}
