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

import type { Activity, IActivityJoinOptions, RealTimeObject } from '@convergence/convergence';
import type { ISetParticipantOperationParams } from '../commands/operations/collaboration.operation';
import Convergence from '@convergence/convergence';
import { Disposable, ICommandService, IConfigService, ILogService, Inject, Injector, IUniverInstanceService, UniverInstanceType } from '@univerjs/core';
import { ParticipantsChangeOperation } from '../commands/operations/collaboration.operation';
import { COLLABORATION_PLUGIN_CONFIG_KEY, defaultPluginConfig, type ICollaborator, type IUniverCollaborationConfig } from '../controllers/config.schema';

export interface ICollaborationConfig {
    server: string;
    contentId: string;
    collaborator: ICollaborator;
    content: unknown;

}

const COLLECTION = 'universheet-test';

export class CollaborationService extends Disposable {
    private _config: IUniverCollaborationConfig = defaultPluginConfig;
    private _activity: Activity;
    private _realTimeObject: RealTimeObject;

    constructor(
        @Inject(Injector) private readonly _injector: Injector,
        @ICommandService private readonly _commandService: ICommandService,
        @IConfigService private readonly _configService: IConfigService,
        @IUniverInstanceService private readonly _univerInstanceService: IUniverInstanceService
    ) {
        super();
        this._initCommands();
    }

    private _initCommands(): void {
        [
            ParticipantsChangeOperation,
        ].forEach((command) => this.disposeWithMe(this._commandService.registerCommand(command)));
    }

    getActivity(): Activity {
        return this._activity;
    }

    getRealTimeObject(): RealTimeObject {
        return this._realTimeObject;
    }

    getParticipant(): ICollaborator | undefined {
        return this._config.collaborator;
    }

    public async start(config: IUniverCollaborationConfig): Promise<void> {
        // 获取配置
        if (!config?.collaborationUrl || !config?.contentId || !config?.data) {
            console.error('Please provide a valid collaborationUrl and contentId in the config.');
            return;
        }

        this._config = config;

        const user = {
            id: config?.collaborator?.userId,
            name: config?.collaborator?.userName,
            avatar: config?.collaborator?.avatar,
        };
        /** 连接协同服务 */
        const domain = await Convergence.connectAnonymously(
            config?.collaborationUrl,
            JSON.stringify(user)
        );
        const model = await domain.models().openAutoCreate({
            id: config?.contentId,
            collection: COLLECTION,
            ephemeral: true,
            data: () => {
                return { initContent: JSON.stringify(config.data) };
            },
        });
        // this._injector.get(ILogService).log('协同服务连接成功');

        const activityOptions: IActivityJoinOptions = { autoCreate: { ephemeral: true, worldPermissions: ['join', 'view_state', 'set_state'] } };
        this._activity = await domain.activities().join('universheet', config?.contentId, activityOptions);

        const aliveParticipants: ISetParticipantOperationParams = {
            participants: [],
            join: null,
            left: null,
        };
        const participants = this._activity.participants();
        aliveParticipants.participants = [];
        participants.forEach((participant) => {
            const itemParticipant = participant.user.displayName ? JSON.parse(participant.user.displayName) : null;
            aliveParticipants.participants.push({
                sessionId: participant.sessionId,
                id: itemParticipant?.id,
                name: itemParticipant?.name,
                avatar: itemParticipant?.avatar,
            });
        });
        this._commandService.executeCommand(ParticipantsChangeOperation.id, aliveParticipants);
        // this._injector.get(ILogService).log('活动用户信息：', aliveParticipants);

        this._realTimeObject = model.root();
        // this._injector.get(ILogService).log('实时对象值：', model.root().value());
        /** 创建实例 */
        this._univerInstanceService.createUnit(UniverInstanceType.UNIVER_SHEET, JSON.parse(model.root().value().initContent));
        // this._univerInstanceService.createUnit(UniverInstanceType.UNIVER_SHEET, config.data);
        // this._injector.get(ILogService).log('创建实例成功');
    }
}
