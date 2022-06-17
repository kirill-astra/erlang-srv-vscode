import * as path from 'path';
import { workspace, ExtensionContext, window } from 'vscode';
import { spawnSync } from 'child_process';

import {
    LanguageClient,
    LanguageClientOptions,
    ServerOptions,
    TransportKind
} from 'vscode-languageclient/node';

export async function getClient(context: ExtensionContext): Promise<LanguageClient> {
    let clientOptions: LanguageClientOptions = {
        documentSelector: [{ scheme: 'file', language: 'erlang' }],
        initializationOptions: getInitializationOptions()
    };

    let serverPath = workspace.getConfiguration('erlangSrv').serverPath;
    if (serverPath === "") {
        serverPath = context.asAbsolutePath(path.join('erlang-srv', 'erlang_srv'));
    };

    let serverArgs = [serverPath];

    let logPath = workspace.getConfiguration('erlangSrv').logPath;
    if (logPath !== "") {
        serverArgs.push("--log-dir", logPath);
    }

    let logLevel = workspace.getConfiguration('erlangSrv').logLevel;
    serverArgs.push("--log-level", logLevel);

    if (workspace.getConfiguration('erlangSrv').logOtp) {
        serverArgs.push("--log-otp", "log");
    }

    let serverOptions: ServerOptions = {
        command: 'escript',
        args: serverArgs,
        transport: TransportKind.stdio
    };

    verifyExecutable(serverPath);

    return new LanguageClient(
        'erlang_srv',
        'Erlang SRV',
        serverOptions,
        clientOptions
    );
}

function getInitializationOptions() {
    let config: { [key: string]: any } = workspace.getConfiguration('erlangSrv').config;

    let options: { [key: string]: any } = {};

    if (config.subProjDirs.length > 0) {
        options.subProjDirs = config.subProjDirs;
    }

    if (config.subProjs.length > 0) {
        options.subProjs = config.subProjs;
    }

    if (config.depDirs.length > 0) {
        options.depDirs = config.depDirs;
    }

    if (config.deps.length > 0) {
        options.deps = config.deps;
    }

    if (config.appsIgnore.length > 0) {
        options.appsIgnore = config.appsIgnore;
    }

    if (config.dirsToScan.length > 0) {
        options.appsDirs = config.dirsToScan;
    }

    if (config.includeDirs.length > 0) {
        options.includeDirs = config.includeDirs;
    }

    if (config.extraPaths.length > 0) {
        options.extraPaths = config.extraPaths;
    }

    options.distrMode = config.erlangDistributionMode;
    options.dedicatedOtpNode = config.dedicatedOtpNode;

    if (config.macros.length > 0) {
        let macroConverter = function (x: string) {
            let re = new RegExp('^-define\\((.*?), *(.*)\\)\\.?$');
            let result = re.exec(x);
            if (result) {
                return { name: result[1], value: result[2] };
            }
        };
        options.macros = config.macros
            .map(macroConverter)
            .filter((x: any) => x !== undefined);
    }

    options.diagnostics = getDiagnostics(config);

    return options;
}

function getDiagnostics(config: { [key: string]: any }) {
    let diagnostics: any[] = [];
    diagnostics.push(getCompilerDiagnostics(config));
    diagnostics.push(getXrefDiagnostics(config));
    diagnostics.push(getElvisDiagnostics(config));
    diagnostics.push(getUnusedMacrosDiagnostics(config));
    diagnostics.push(getDialyzerDiagnostics(config));
    return diagnostics.reverse();
}

function getCompilerDiagnostics(config: { [key: string]: any }) {
    if (config.diagnostic.compiler) {
        let options: { [key: string]: any } = {};
        if (config.diagnosticCompiler.options !== "[]") {
            options.extraOptions = config.diagnosticCompiler.options;
        }
        if (config.diagnosticCompiler.deployNode !== "") {
            options.deployNode = config.diagnosticCompiler.deployNode;
        }
        if (config.diagnosticCompiler.deployCookie !== "") {
            options.deployCookie = config.diagnosticCompiler.deployCookie;
        }
        return { name: "compiler", enabled: true, options: options };
    } else {
        return { name: "compiler", enabled: false };
    }
}

function getXrefDiagnostics(config: { [key: string]: any }) {
    if (config.diagnostic.xref) {
        let toSkip: any[] = [];
        if (config.diagnosticXref.SkipModules.length > 0) {
            config.diagnosticXref.SkipModules.forEach(function (m: string) {
                toSkip.push({ module: m });
            });
        };
        if (config.diagnosticXref.SkipFunctions.length > 0) {
            config.diagnosticXref.SkipFunctions.forEach(function (mf: string) {
                let re = new RegExp('^(.*):(.*)$');
                let result = re.exec(mf);
                if (result) {
                    let module = result[1];
                    let fun = result[2];
                    let isAdded = false;
                    toSkip = toSkip.map(function (e: any) {
                        if (e.module === module) {
                            if (e.hasOwnProperty('functions')) {
                                e.functions.push(fun);
                            } else if (e.hasOwnProperty('types')) {
                                e.functions = [fun];
                            };
                            isAdded = true;
                        };
                        return e;
                    });
                    if (!isAdded) {
                        toSkip.push({ module: module, functions: [fun] });
                    }
                }
            });
        };
        if (config.diagnosticXref.SkipTypes.length > 0) {
            config.diagnosticXref.SkipTypes.forEach(function (mt: string) {
                let re = new RegExp('^(.*):(.*)$');
                let result = re.exec(mt);
                if (result) {
                    let module = result[1];
                    let type = result[2];
                    let isAdded = false;
                    toSkip = toSkip.map(function (e: any) {
                        if (e.module === module) {
                            if (e.hasOwnProperty('types')) {
                                e.types.push(type);
                            } else if (e.hasOwnProperty('functions')) {
                                e.types = [type];
                            };
                            isAdded = true;
                        };
                        return e;
                    });
                    if (!isAdded) {
                        toSkip.push({ module: module, types: [type] });
                    }
                }
            });
        };
        return { name: "xref", enabled: true, options: { toSkip: toSkip } };
    } else {
        return { name: "xref", enabled: false };
    }
}

function getElvisDiagnostics(config: { [key: string]: any }) {
    if (config.diagnostic.elvis) {
        let options: { [key: string]: any } = {};
        if (config.diagnosticElvis.ConfigPath !== "") {
            options.config = config.diagnosticElvis.ConfigPath;
        }
        return { name: "elvis", enabled: true, options: options };
    } else {
        return { name: "elvis", enabled: false };
    }
}

function getUnusedMacrosDiagnostics(config: { [key: string]: any }) {
    if (config.diagnostic.unusedMacros) {
        let toSkip: any[] = [];
        if (config.diagnosticUnusedMacros.SkipModules.length > 0) {
            config.diagnosticUnusedMacros.SkipModules.forEach(function (m: string) {
                toSkip.push({ module: m });
            });
        };
        if (config.diagnosticUnusedMacros.SkipMacros.length > 0) {
            config.diagnosticUnusedMacros.SkipMacros.forEach(function (mm: string) {
                let re = new RegExp('^(.*):(.*)$');
                let result = re.exec(mm);
                if (result) {
                    let module = result[1];
                    let macro = result[2];
                    let isAdded = false;
                    toSkip = toSkip.map(function (e: any) {
                        if (e.module === module) {
                            if (e.hasOwnProperty('macros')) {
                                e.macros.push(macro);
                            };
                            isAdded = true;
                        };
                        return e;
                    });
                    if (!isAdded) {
                        toSkip.push({ module: module, macros: [macro] });
                    }
                }
            });
        };
        return { name: "unused_macros", enabled: true, options: { toSkip: toSkip } };
    } else {
        return { name: "unused_macros", enabled: false };
    }
}

function getDialyzerDiagnostics(config: { [key: string]: any }) {
    if (config.diagnostic.dialyzer) {
        let options: { [key: string]: any } = {};
        if (config.diagnosticDialyzer.plts.length > 0) {
            options.plts = config.diagnosticDialyzer.plts;
        }
        return { name: "dialyzer", enabled: true, options: options };
    } else {
        return { name: "dialyzer", enabled: false };
    }
}

function verifyExecutable(serverPath: string) {
    const res = spawnSync('escript', [serverPath, "--version"]);
    if (res.status !== 0) {
        window.showErrorMessage('Could not start Language Server. Error: ' + res.stdout);
    }
}