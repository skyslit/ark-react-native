import React from 'react';
import { Reducer, Store } from 'redux';
import { ArkPackage, PackageGlobalState } from "./package";

export type ComponentMap = {
    [key: string]: React.ComponentType<any>
}

export type ActionTypes = {
    [k: string]: string
}

export interface IArkModule<StateType = any> {
    type: string
    id: string

    package: ArkPackage
    views: ComponentMap
    components: ComponentMap
    controller: any
    services: any
    state: StateType
    actionTypes: ActionTypes
    
    getReducer: () => Reducer
    getState: () => StateType
}

export type ArkPackageOption<ModuleType = any, PackageStateType = any> = Readonly<IArkPackage<ModuleType, PackageStateType>>

export interface IArkPackage<ModuleType = any, PackageStateType = any> {
    modules: ModuleType
    store: Store<PackageStateType>

    Router: React.FunctionComponent

    setupStore: (enableReduxDevTool?: boolean) => Store<PackageStateType>
    initialize: (mode: 'Browser' | 'Server', done: (err: Error, options: ArkPackageOption<ModuleType, PackageStateType>) => void) => void
}

export type ComponentPropType<ModuleType extends IArkModule> = {
    global: PackageGlobalState
    module: ModuleType
    context: {
        [k in keyof ModuleType["state"]]: ModuleType["state"][k]
    }
}

export type ViewComponentPropType<ModuleType extends IArkModule> = ComponentPropType<ModuleType>