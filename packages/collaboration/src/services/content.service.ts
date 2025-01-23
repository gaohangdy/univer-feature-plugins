/**
 * Copyright 2023-present DreamNum Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import type { IConvergenceEvent, ObjectSetEvent } from '@convergence/convergence';
import type { IWorkbookData, Nullable } from '@univerjs/core';
import { RealTimeObject } from '@convergence/convergence';
import { Disposable, ICommandService, ILogService, Inject, Injector, IUniverInstanceService, Tools, UniverInstanceType } from '@univerjs/core';
import { cloneDeep } from 'lodash-es';
import { CollaborationService } from './collaboration.service';

export class ContentService extends Disposable {
    private _rtContent: RealTimeObject;

    constructor(
        @Inject(Injector) private readonly _injector: Injector,
        @ICommandService private readonly _commandService: ICommandService,
        @IUniverInstanceService private readonly _univerInstanceService: IUniverInstanceService,
        @Inject(CollaborationService) private readonly _collaborationService: CollaborationService
    ) {
        super();
        this._collaborateStartup();
    }

    private _collaborateStartup() {
        this._rtContent = this._collaborationService.getRealTimeObject();

        // Remote -> Local：监听远端数据变化，并执行本地命令
        this._rtContent.on(RealTimeObject.Events.SET, (event: IConvergenceEvent) => {
            const message = event as ObjectSetEvent;
            const content = message.value.value();
            if (!content.includes('command')) {
                return;
            }

            const commandInfo = JSON.parse(content);
            const { clonedCommand, options } = commandInfo;
            const { id, params } = clonedCommand;

            // 接受到协同数据，本地落盘
            this._commandService.executeCommand(id, params, options);
        });

        // Local -> Remote：监听本地命令执行，将命令发送到远端
        this._commandService.onCommandExecuted((command, options) => {
            // 仅同步本地 mutation
            // if ((command.type !== 1 && command.type !== 2) || options?.fromCollab || options?.onlyLocal || command.id === 'doc.mutation.rich-text-editing') {
            if (command.type !== 2 || options?.fromCollab || options?.onlyLocal || command.id === 'doc.mutation.rich-text-editing') {
                // console.log('不发送');
                return;
            }

            // console.log('协同内容发送: ', command, options);
            const clonedCommand = cloneDeep(command);
            const commandInfo = JSON.stringify({ clonedCommand, options: { fromCollab: true } });

            this._rtContent.set('content', commandInfo);

            // 更新协同对象中的root 数据
            // this._injector.get(ILogService).log('远程初始数据：', this._rtContent.value());
            // this._injector.get(ILogService).log('远程初始数据(initContent)：', this._rtContent.value().initContent);
            const remoteUnit: IWorkbookData = JSON.parse(this._rtContent.value().initContent);

            const latestData: IWorkbookData = this._univerInstanceService.getUnit(remoteUnit.id, UniverInstanceType.UNIVER_SHEET)?.getSnapshot() as IWorkbookData;
            // this._injector.get(ILogService).log('设置数据：', latestData);
            const cloneUnit = Tools.deepClone(latestData);
            this._rtContent.set('initContent', JSON.stringify(cloneUnit));
        });

        // console.log('remote data', this._rtContent.get('content'));
    }
}
