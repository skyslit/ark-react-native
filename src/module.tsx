import React from 'react';
import { IArkModule, ComponentMap, ActionTypes } from "./types"
import { ArkPackage, PackageStoreType, CORE_PACKAGE_ID } from "./package"
import { Reducer, AnyAction } from "redux";
import { AxiosInstance } from 'axios';

type ProviderMap<T> = Record<Extract<T, string>, AxiosInstance>;

export class ArkModule<StateType = any, Providers = any> implements IArkModule<StateType> {
    type: string = null;
    id: string = null;
    initializeServerContext: boolean = false;

    package: ArkPackage = null;
    views: ComponentMap = {};
    components: ComponentMap = {};
    controller: any;
    services: any;
    state: StateType = {} as any;
    actionTypes: ActionTypes = {} as any;

    private connect: any;
    
    providers: ProviderMap<Providers> = {} as any

    constructor (type: string, opts?: Partial<ArkModule>) {
        this.type = type;
        if (opts) {
            Object.keys(opts).forEach(k => (this as any)[k] = (opts as any)[k]);
        }
    }

    useConnect(_connect: any): void {
        console.log('Connected...');
        this.connect = _connect;
    }
    
    getReducer(): Reducer<StateType> {
        return null;
    }

    getState(): StateType {
        if (!this.package) {
            throw new Error('Package not found');
        }
        if (!this.package.store) {
            throw new Error('Store has not setup yet');
        }
        return this.package.store.getState()[this.id];
    }

    dispatch(action: AnyAction): AnyAction {
        return this.package.store.dispatch(action);
    }

    getServiceProvider(id: Providers): AxiosInstance {
        // @ts-ignore
        if (this.providers[id]) {
            // @ts-ignore
            return this.providers[id];
        }

        // @ts-ignore
        this.providers[id] = this.package._resolveServiceProvider(this.id, id);
        // @ts-ignore
        return this.providers[id];
    }

    setCurrentUser(isAuthenticated: boolean = false, token: string = null, userInfo: any = null): void {
        this.dispatch({
            type: PackageStoreType.CORE_SET_CURRENT_USER,
            payload: {
                isAuthenticated,
                userInfo,
                token
            }
        })
    }

    getCurrentUser<T = any>(): Readonly<T> {
        const state = this.package.store.getState();
        if (state && state.__CORE_PACKAGE) {
            return state.__CORE_PACKAGE.userInfo;
        }
        
        return null;
    }

    isAuthenticated(): boolean {
        const state = this.package.store.getState();
        if (state && state.__CORE_PACKAGE) {
            return state.__CORE_PACKAGE.isAuthenticated === true;
        }

        return false;
    }

    private attachContextToComponent(masterProps: { module: ArkModule }) {
        if (!this.connect) {
            throw new Error(`You probably missed out useConnect in module '${this.id}'`)
        }
        return (Component: React.ComponentType<any>) => {
            return this.connect((state: any) => ({
                global: (state as any)[CORE_PACKAGE_ID],
                context: (state as any)[this.id]
            }))((props: any) => <Component {...props} {...masterProps} />)
        }
    }

    normalizeActionTypes() {
        Object.keys(this.actionTypes).forEach(key => {
            (this.actionTypes as any)[key] = `${this.id}-${(this.actionTypes as any)[key]}`
        })
    }

    attachContextToComponents(componentMap: ComponentMap) {
        Object.keys(componentMap).forEach(key => {
            (componentMap as any)[key] = this.attachContextToComponent({ module: this })(componentMap[key]);
        })
    }

    main() {}
}