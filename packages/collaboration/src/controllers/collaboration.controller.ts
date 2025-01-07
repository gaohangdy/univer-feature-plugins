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

import type {
    IActivityJoinOptions,
    RealTimeObject } from '@convergence/convergence';
import type { IUniverCollaborationConfig } from './config.schema';
import Convergence from '@convergence/convergence';
import { connectInjector, Disposable, ICommandService, IConfigService, Inject, Injector, IUniverInstanceService, UniverInstanceType } from '@univerjs/core';
import { BuiltInUIPart, IUIPartsService } from '@univerjs/ui';
import { ParticipantsChangeOperation } from '../commands/operations/collaboration.operation';

import { ContentService } from '../services/content.service';
import { SelectionService } from '../services/selection.service';
import { HeaderMenu } from '../views/components/HeaderMenu';
import { COLLABORATION_PLUGIN_CONFIG_KEY } from './config.schema';

const COLLECTION = 'universheet-test';
export class CollaborationController extends Disposable {
    private _rtSheet: RealTimeObject;
    constructor(
        @Inject(Injector) private readonly _injector: Injector,
        @ICommandService private readonly _commandService: ICommandService,
        @IConfigService private readonly _configService: IConfigService,
        @IUIPartsService private readonly _uiPartsService: IUIPartsService,
        @IUniverInstanceService private readonly _univerInstanceService: IUniverInstanceService,
        @Inject(ContentService) private readonly _contentService: ContentService,
        @Inject(SelectionService) private readonly _selectionService: SelectionService
        // @Inject(ActivityColorManager) private readonly _activityColorManager: ActivityColorManager,
    ) {
        super();
        this._initCommands();
        // this._registerCompareFns();
        this._initHeaderMenu();
        this._registerRealTimeModel();
    }

    private async _registerRealTimeModel(): Promise<void> {
        // 获取配置
        const config = this._configService.getConfig<IUniverCollaborationConfig>(COLLABORATION_PLUGIN_CONFIG_KEY);
        if (!config?.collaborationUrl || !config?.contentId) {
            console.error('Please provide a valid collaborationUrl and contentId in the config.');
            return;
        }

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
        // console.log('协同服务连接成功', model);

        const activityOptions: IActivityJoinOptions = { autoCreate: { ephemeral: true, worldPermissions: ['join', 'view_state', 'set_state'] } };
        const activity = await domain.activities().join('universheet', config?.contentId, activityOptions);

        // this._univerInstanceService.createUnit(UniverInstanceType.UNIVER_SHEET, JSON.parse(model.root().value().initContent));

        // /** 启动活动颜色服务 */
        // this._activityColorManager.collaborateStartup(activity);

        /** 启动协同用户活动服务 */
        // this._selectionService.collaborateStartup(activity, config.collaborator?.userName, config.collaborator?.avatar);

        this._rtSheet = model.root();
        /** 启动内容实时协同服务 */
        // this._contentService.collaborateStartup(this._rtSheet);
    }

    private _initCommands(): void {
        [
            ParticipantsChangeOperation,
        ].forEach((command) => this.disposeWithMe(this._commandService.registerCommand(command)));
    }

    private _initHeaderMenu(): void {
        this._uiPartsService.registerComponent(BuiltInUIPart.HEADER_MENU, () => connectInjector(HeaderMenu, this._injector));
    }
}
