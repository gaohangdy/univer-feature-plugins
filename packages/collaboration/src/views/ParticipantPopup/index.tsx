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

import type { IParticipantPopup } from '../../services/popup.service';
import { IUniverInstanceService, useDependency } from '@univerjs/core';
import { Avatar } from '@univerjs/design';
import React, { useEffect, useState } from 'react';
import { ParticipantPopupService } from '../../services/popup.service';
// import styles from './index.module.less';

export const getAvaterText = (name: any) => {
    let fullName = '';
    if (!name) {
        fullName = 'un';
    } else {
        if (name.length > 2) {
            fullName = name.substring(name.length - 2, name.length);
        } else if (name.length <= 2 && name.length >= 1) {
            fullName = name.substring(name.length - 1, name.length);
        } else {
            fullName = 'un';
        }
    }

    return fullName;
};

export const getAvatarColor = () => {
    const colors = ['E57470', 'E88B4D', 'DCAB35', 'A2C143', '67B85D', '47C2C4', '4C93D4', '937DC1', 'CB7DA7', '936E61'];
    const randomIndex = Math.floor(Math.random() * colors.length);
    return `#${colors[randomIndex]}`;
};

export const ParticipantPopup = () => {
    const popupService = useDependency(ParticipantPopupService);
    const [currentPopup, setCurrentPopup] = useState<IParticipantPopup | null>(null);

    useEffect(() => {
        setCurrentPopup(popupService.activePopup);
        const ob = popupService.activePopup$.subscribe((popup) => {
            setCurrentPopup(popup);
        });
        return () => {
            ob.unsubscribe();
        };
    }, [popupService.activePopup, popupService.activePopup$]);

    if (!currentPopup) {
        // console.log("No active popup");
        return null;
    }
    // console.log("active popup");
    return (
        <div style={{ marginLeft: '8px' }} onClick={() => popupService.hidePopup()}>
            {currentPopup && currentPopup.avatar && currentPopup.avatar !== '' ?
                <Avatar src={currentPopup.avatar} size={20}></Avatar> :
                <Avatar size={20} style={{ backgroundColor: getAvatarColor() }}>{getAvaterText(currentPopup.name)}</Avatar>}
            <span style={{ fontSize: '14px', paddingLeft: '5px' }}>{currentPopup.name}</span>
        </div>
    );
};

ParticipantPopup.componentKey = 'univer.sheet.participant-popup';
