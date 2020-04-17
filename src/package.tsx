import React from 'react';
import { createStore, compose, applyMiddleware, combineReducers, Store, AnyAction, Reducer } from "redux";
import { i18n, InitOptions, ThirdPartyModule } from 'i18next';
import { I18nextProviderProps } from 'react-i18next';
import Axios, { AxiosInstance, AxiosRequestConfig } from 'axios';
import { ArkModule } from './module';
import { IArkPackage, ArkPackageOption } from './types';
import { loadTheme, removeThemeLink } from './browser';

type CORE_PACKAGE_ID_TYPE = '__CORE_PACKAGE';
export const CORE_PACKAGE_ID: CORE_PACKAGE_ID_TYPE = '__CORE_PACKAGE';

export type PackageGlobalState = {
    isAuthenticated: boolean
    token: string
    userInfo: any
    currentThemeId: string
    currentThemeType: 'light' | 'dark'
    isThemeChanging: boolean

    // Global Alerts
    errorAlert: {
        isOpen?: boolean
        title?: string
        message?: string
        canCloseManually?: boolean
    }
    waitAlert: {
        isOpen?: boolean
        title?: string
        message?: string
        canCloseManually?: boolean
    }
    messageAlert: {
        isOpen?: boolean
        title?: string
        message?: string
        canCloseManually?: boolean
    }
}

export const PackageStoreType = {
    CORE_SET_CURRENT_USER: `${CORE_PACKAGE_ID}_SET_CURRENT_USER`,
    CORE_SET_THEME: `${CORE_PACKAGE_ID}_SET_THEME`,
    CORE_SET_ERROR: `${CORE_PACKAGE_ID}_SET_ERROR`,
    CORE_SET_WAIT: `${CORE_PACKAGE_ID}_SET_WAIT`,
    CORE_SET_MSG: `${CORE_PACKAGE_ID}_SET_MSG`,
    CORE_CLEAR_ALERT: `${CORE_PACKAGE_ID}_CLEAR_ALERT`,
}

const initialState: PackageGlobalState = {
    isAuthenticated: false,
    token: null,
    userInfo: null,
    currentThemeId: 'default',
    currentThemeType: 'light',
    isThemeChanging: false,

    // Global Alerts
    errorAlert: {
        isOpen: false
    },
    waitAlert: {
        isOpen: false
    },
    messageAlert: {
        isOpen: false
    }
}

const createPackageReducer = (): Reducer => (state: Partial<PackageGlobalState> = initialState, action: AnyAction) => {
    switch (action.type) {
        case PackageStoreType.CORE_SET_CURRENT_USER: {
            const { isAuthenticated, userInfo, token } = action.payload;
            return Object.assign({}, state, {
                isAuthenticated,
                userInfo,
                token
            })
        }
        case PackageStoreType.CORE_SET_THEME: {
            const { currentThemeId, isThemeChanging, currentThemeType } = action.payload;
            return Object.assign({}, state, {
                currentThemeId,
                currentThemeType: currentThemeType ? currentThemeType : 'light',
                isThemeChanging: isThemeChanging ? isThemeChanging : false
            })
        }
        case PackageStoreType.CORE_SET_MSG:
        case PackageStoreType.CORE_SET_WAIT:
        case PackageStoreType.CORE_SET_ERROR: {
            const { value } = action.payload;
            const _key = {
                [PackageStoreType.CORE_SET_MSG]: 'messageAlert',
                [PackageStoreType.CORE_SET_WAIT]: 'waitAlert',
                [PackageStoreType.CORE_SET_ERROR]: 'errorAlert',
            }
            return Object.assign({}, state, {
                [_key[action.type]]: value
            })
        }
        case PackageStoreType.CORE_CLEAR_ALERT: {
            return Object.assign({}, state, {
                messageAlert: Object.assign({}, state.messageAlert, {
                    isOpen: false
                }),
                errorAlert: Object.assign({}, state.errorAlert, {
                    isOpen: false
                }),
                waitAlert: Object.assign({}, state.waitAlert, {
                    isOpen: false
                })
            })
        }
        default: {
            return state;
        }
    }
}

export type PackageStateType<ModuleType> = {
    // @ts-ignore
    [k in keyof ModuleType]: ModuleType[k]["state"]
}

export type ConfigEnvironment<T> = {
    default: T
    development?: Partial<T>
    staging?: Partial<T>
    production?: Partial<T>
    [k: string]: Partial<T>
}

export type BaseConfigType<SPT = 'Main'> = Record<Extract<SPT, string>, Partial<AxiosRequestConfig>>

export type ServiceProviderBase = 'Main'
export type ServiceProvider<Providers> = {
    // @ts-ignore
    [k in Providers]: AxiosInstance
}
export type ServiceProviderConfiguration<Providers> = {
    // @ts-ignore
    [k in Providers]: AxiosRequestConfig
}

export type ModuleServiceProviderMap<ModuleType> = {
    [k in keyof ModuleType]?: {
        // @ts-ignore
        [y in keyof ModuleType[k]["providers"]]?: AxiosInstance
    }
}

export type PackageConfiguration = {
    autoConfigureInitialRoutes: boolean
}

export type ThemePack = {
    id: string
    url: string
    type: 'light' | 'dark'
}

export class ArkPackage<ModuleType = any, ConfigType = BaseConfigType, ServiceProviderType = ServiceProviderBase> implements IArkPackage<ModuleType> {
    static instance: any;
    static getInstance<ModuleType = any, ConfigType = BaseConfigType, ServiceProviderType = ServiceProviderBase>(): ArkPackage<ModuleType, ConfigType, ServiceProviderType> {
        if (!ArkPackage.instance) {
            ArkPackage.instance = new ArkPackage<ModuleType, ConfigType, ServiceProviderType>();
            return ArkPackage.instance as ArkPackage<ModuleType, ConfigType, ServiceProviderType>;
        }

        return ArkPackage.instance as ArkPackage<ModuleType, ConfigType, ServiceProviderType>;
    }

    mode: 'Browser' | 'Server' = null;
    modules: ModuleType = {} as any
    store: Store<Record<CORE_PACKAGE_ID_TYPE, PackageGlobalState> & PackageStateType<ModuleType>> = null;
    configOpts: ConfigEnvironment<ConfigType & BaseConfigType<ServiceProviderType>> = { 'default': {} as any };
    configMode: string = 'default';
    serviceProviderModuleMap: ModuleServiceProviderMap<ModuleType> = {} as any;
    themes: ThemePack[] = [
        {
            id: 'default',
            type: 'light',
            url: null
        }
    ];

    private i18n: i18n;
    private i18nInitOptions: InitOptions;
    private i18nReactInitializer: ThirdPartyModule;
    private I18nextProvider: React.ComponentType<I18nextProviderProps>;
    private packageConfiguration: Partial<PackageConfiguration> = {} as any;
    private _serviceProviders: ServiceProvider<ServiceProviderType> = {} as any;
    private _serviceProviderConfigurations: ServiceProviderConfiguration<ServiceProviderType> = {} as any;
    private _reduxConnector: any = null;

    Router: React.FunctionComponent<{ location?: string }>

    usei18next(i18n: i18n, provider: React.ComponentType<I18nextProviderProps>, initializer: ThirdPartyModule, options?: InitOptions): this {
        options = Object.assign({
            resources: {
                en: {
                    translation: {
                        "Translation Test": "Translation Test [DONE]"
                    }
                }
            },
            lng: "en",
            fallbackLng: "en",

            keySeparator: false,

            interpolation: {
                escapeValue: false
            }
        }, options || {});

        this.i18n = i18n;
        this.i18nReactInitializer = initializer;
        this.i18nInitOptions = options;
        this.I18nextProvider = provider;
        return this;
    }

    configure(opts: Partial<PackageConfiguration>) {
        this.packageConfiguration = opts;
    }

    private getPackageConfiguration(): Readonly<PackageConfiguration> {
        return Object.assign<Partial<PackageConfiguration>, any>({
            autoConfigureInitialRoutes: false
        }, this.packageConfiguration);
    }

    registerModule(id: string, _module: ArkModule) {
        // Register views
        _module.id = id;
        _module.package = this as any;
        _module.normalizeActionTypes();
        _module.attachContextToComponents(_module.components);
        _module.attachContextToComponents(_module.views);
        // @ts-ignore
        this.modules[id] = _module;
    }

    registerThemes(...themes: ThemePack[]) {
        this.themes.push(...themes);
    }

    setTheme(id: string) {
        if (id === 'default') {
            this.store.dispatch({
                type: PackageStoreType.CORE_SET_THEME,
                payload: {
                    currentThemeId: id,
                    currentThemeType: 'light',
                    isThemeChanging: false
                }
            })
            if (localStorage && localStorage !== undefined) {
                localStorage.removeItem('selected-theme-id');
            }
            if (this.mode === 'Browser') {
                removeThemeLink();
            }
            return;
        }

        if (!this.mode) {
            throw new Error('setTheme can only be called after initialize call');
        }

        const theme = this.themes.find(t => t.id === id);
        if (theme) {
            // Get old theme id
            const state = this.store.getState();
            const oldThemeId = state.__CORE_PACKAGE.currentThemeId;
            const oldThemeType = state.__CORE_PACKAGE.currentThemeType;

            this.store.dispatch({
                type: PackageStoreType.CORE_SET_THEME,
                payload: {
                    currentThemeId: id,
                    currentThemeType: theme.type,
                    isThemeChanging: true
                }
            })
            if (this.mode === 'Browser') {
                if (document && document !== undefined) {
                    loadTheme(theme.id, theme.url, (success, link) => {
                        if (success) {
                            setTimeout(() => {
                                removeThemeLink(oldThemeId);
                                this.store.dispatch({
                                    type: PackageStoreType.CORE_SET_THEME,
                                    payload: {
                                        currentThemeId: id,
                                        currentThemeType: theme.type,
                                        isThemeChanging: false
                                    }
                                })
                            }, 1000);
                            if (localStorage && localStorage !== undefined) {
                                localStorage.setItem('selected-theme-id', id);
                            }
                        } else {
                            this.store.dispatch({
                                type: PackageStoreType.CORE_SET_THEME,
                                payload: {
                                    currentThemeId: oldThemeId,
                                    currentThemeType: oldThemeType,
                                    isThemeChanging: false
                                }
                            })
                        }
                    }, this)
                }
            }
        } else {
            throw new Error(`Theme ID '${id}' is not registered`);
        }
    }

    showMessage(message: string, title?: string, canCloseManually?: boolean) {
        title = title ? title : 'Message';
        canCloseManually = canCloseManually ? canCloseManually : false;
        this.store.dispatch({
            type: PackageStoreType.CORE_SET_MSG,
            payload: {
                value: {
                    isOpen: true,
                    title,
                    message,
                    canCloseManually
                }
            }
        })
    }

    showWait(message: string, title?: string, canCloseManually?: boolean) {
        title = title ? title : 'Please wait...';
        canCloseManually = canCloseManually ? canCloseManually : false;
        this.store.dispatch({
            type: PackageStoreType.CORE_SET_WAIT,
            payload: {
                value: {
                    isOpen: true,
                    title,
                    message,
                    canCloseManually
                }
            }
        })
    }

    showError(message: string, title?: string, canCloseManually?: boolean) {
        title = title ? title : 'Error';
        canCloseManually = canCloseManually ? canCloseManually : false;
        this.store.dispatch({
            type: PackageStoreType.CORE_SET_ERROR,
            payload: {
                value: {
                    isOpen: true,
                    title,
                    message,
                    canCloseManually
                }
            }
        })
    }

    clearAlert() {
        this.store.dispatch({
            type: PackageStoreType.CORE_CLEAR_ALERT
        })
    }

    getModuleByType<ModuleType = any>(type: string): ModuleType {
        Object.keys(this.modules).forEach((id) => {
            if ((this.modules as any)[id].type === type) {
                return (this.modules as any)[id] as ModuleType
            }
        })

        return null;
    }

    getConfig(): Readonly<ConfigType> {
        if (this.configOpts[this.configMode]) {
            return Object.assign({}, this.configOpts['default'], this.configOpts[this.configMode] as any);
        } else {
            return this.configOpts['default'];
        }
    }

    setupStore(enableReduxDevTool: boolean = false): Store<PackageStateType<ModuleType>> {
        if (this.store) {
            return this.store;
        }

        // Aggregate reducers from all modules
        const reducerMap: any = {
            [CORE_PACKAGE_ID]: createPackageReducer()
        };
        Object.keys(this.modules).forEach((id) => {
            const _reducer: any = (this.modules as any)[id].getReducer();
            if (_reducer) {
                reducerMap[id] = _reducer;
            }
        });

        if (Object.keys(reducerMap).length < 1) {
            console.warn('None of your modules use a valid reducer. So please consider NOT using setupStore() in your code')
        }

        let composeScript = null;
        let middlewares: any[] = [];
        if (enableReduxDevTool) {
            composeScript = compose(applyMiddleware(...middlewares));
            if (typeof window !== 'undefined') {
                if ((window as any).__REDUX_DEVTOOLS_EXTENSION__) {
                    composeScript = compose(
                        applyMiddleware(...middlewares),
                        (window as any).__REDUX_DEVTOOLS_EXTENSION__()
                    );
                }
            }
        } else {
            composeScript = compose(applyMiddleware(...middlewares));
        }

        this.store = createStore<PackageStateType<ModuleType>, any, any, any>(combineReducers<PackageStateType<ModuleType>>(reducerMap), composeScript);

        // Initialze state dependent process
        this._initializeTheme();

        return this.store;
    }

    isAuthenticated(): boolean {
        const state = this.store.getState();
        if (state && state.__CORE_PACKAGE) {
            return state.__CORE_PACKAGE.isAuthenticated && state.__CORE_PACKAGE.isAuthenticated === true;
        }
    }

    private _getServiceProviderConfiguration(provider: ServiceProviderType): AxiosRequestConfig {
        // @ts-ignore
        if (this.getConfig()[provider]) {
            // @ts-ignore
            return this.getConfig()[provider] as AxiosRequestConfig;
        }

        return {}
    }

    _resolveServiceProvider(moduleId: string, providerId: string) {
        // @ts-ignore
        if (this.serviceProviderModuleMap[moduleId]) {
            // @ts-ignore
            if (this.serviceProviderModuleMap[moduleId][providerId]) {
                // @ts-ignore
                return this.serviceProviderModuleMap[moduleId][providerId];
            }
        }

        // @ts-ignore
        return this.getServiceProvider('Main');
    }

    getServiceProvider(provider: ServiceProviderType): AxiosInstance {
        // @ts-ignore
        if (this._serviceProviders[provider]) {
            // @ts-ignore
            return this._serviceProviders[provider];
        }

        // @ts-ignore
        this._serviceProviders[provider] = Axios.create(this._getServiceProviderConfiguration(provider));
        // @ts-ignore
        return this._serviceProviders[provider];
    }

    private _initializeTheme() {
        if (this.mode === 'Browser') {
            if (localStorage && localStorage !== undefined) {
                const themeId = localStorage.getItem('selected-theme-id');
                if (themeId && themeId !== '') {
                    this.setTheme(themeId);
                }
            }
        } else {
            console.warn('Theme setup skipped in server');
        }
    }

    private _initializeModules() {
        Object.keys(this.modules).forEach(module => {
            // @ts-ignore
            if (this.modules[module]) {
                // @ts-ignore
                this.modules[module].main();
            }
        })
    }

    private _initializeApp(mode: 'Browser' | 'Server', done: (err: Error, options: ArkPackageOption<ModuleType, PackageStateType<ModuleType>>) => void, connect?: any) {
        this.mode = mode;
        this.setupStore(true);
        // Attach redux connector
        this._reduxConnector = connect;
        this._initializeModules();
        this.Router = (props) => {
            const state = this.store.getState();
            let themeId: string = 'default';
            let themeType: string = 'light';
            if (state && state.__CORE_PACKAGE) {
                themeId = state.__CORE_PACKAGE.currentThemeId;
                themeType = state.__CORE_PACKAGE.currentThemeType;
            }

            return (
                <this.I18nextProvider i18n={this.i18n}>
                    
                </this.I18nextProvider>
            )
        }

        // Connect component if redux connector is available
        if (this._reduxConnector) {
            this.Router = this._reduxConnector((state: any) => ({ reduxState: state.__CORE_PACKAGE }))(this.Router);
        }

        done(null, this as any);
    }

    initialize(mode: 'Browser' | 'Server', done: (err: Error, options: ArkPackageOption<ModuleType, PackageStateType<ModuleType>>) => void, connect?: any) {
        if (!this.i18n) throw new Error('Looks like you missed out to connect i18next');
        this.i18n
        .use(this.i18nReactInitializer)
        .init(this.i18nInitOptions, (err, t) => {
            if (err) {
                throw err;
            }
            this._initializeApp(mode, done, connect);
        })
    }
}