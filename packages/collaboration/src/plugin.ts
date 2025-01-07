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

import type { Dependency } from '@univerjs/core';
import { Inject, Injector, Plugin, UniverInstanceType } from '@univerjs/core';

import { ParticipantPopupController } from './controllers/popup.controller';
import { ActivityColorManager } from './services/activity-color-manager.service';
import { ContentService } from './services/content.service';
import { ParticipantPopupService } from './services/popup.service';
import { SelectionService } from './services/selection.service';

const NAME = 'SHEET_COLLABORATION_PLUGIN';
export class UniverCollaborationPlugin extends Plugin {
    static override type = UniverInstanceType.UNIVER_SHEET;
    static override pluginName = NAME;

    constructor(
        @Inject(Injector) protected readonly _injector: Injector
    ) {
        super();
    }

    /**
        Starting    plugin挂载到 Univer 实例上的第一个生命周期，plugin 在此生命周期中应该将自己模块加入到依赖注入系统当中。
        Ready       Univer的第一个业务实例已经创建，plugin 可以在此生命周期做大部分初始化工作。
        Rendered    第一次渲染已经完成，plugin 可以在此生命周期进行需要依赖渲染和 DOM 的初始化工作。
        Steady      在Rendered 一段时间之后触发，plugin 可以在此生命周期进行非首屏必须的工作，以提升加载性能。
     */

    override onStarting(): void {
        ([
            [ActivityColorManager],
            [ContentService],
            [SelectionService],
            [ParticipantPopupController],
            [ParticipantPopupService],
        ] as Dependency[]).forEach((d) => this._injector.add(d));
    }

    override onReady(): void {
        this._injector.get(ContentService);
        this._injector.get(ParticipantPopupController);
    }

    override onRendered(): void { }
    override onSteady(): void { }
}
