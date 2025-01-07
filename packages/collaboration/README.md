# @nuzar-components/univer-collaboration

## Package Overview

| Package Name | UMD Namespace | Version | License | Downloads | Contains CSS | Contains i18n locales |
| --- | --- | --- | --- | --- | :---: | :---: |
| `@nuzar-components/univer-collaboration` | `UniverCollaborationPlugin` | [![][npm-version-shield]][npm-version-link] | ![][npm-license-shield] | ![][npm-downloads-shield] | ⭕️ | ⭕️ |

## Introduction

`@nuzar-components/univer-collaboration` provides a collaboration feature that allows users to collaborate in the workbook.

## Usage

### Installation

```shell
# Using npm
npm install @nuzar-components/univer-collaboration

# Using pnpm
pnpm add @nuzar-components/univer-collaboration
```

### Register the plugin

```typescript
import { CollaborationService, UniverCollaborationPlugin } from '@nuzar-components/univer-collaboration';

univer.registerPlugin(UniverCollaborationPlugin);
```

### API
```typescript
const injector = univer.__getInjector();

injector.add([CollaborationService]);
const collaborationService = injector.get(CollaborationService);
collaborationService.start({
    contentId: "plugin-test-1217", //createUUID(),
    collaborationUrl,
    collaborator,
    data: data,
});


const univerAPI = FUniver.newAPI(univer);

univerAPI.onCommandExecuted((command) => {
    if (command.id === 'collaboration.command.participants.change') {
        console.log('协同用户发生变化', command.params);
        let strParticipants = '';
        command.params.participants.forEach((participant) => {
            strParticipants += participant.name + ',';
            console.log('用户', participant.name);
        });
        setParticipants(strParticipants);
    }
});
```
