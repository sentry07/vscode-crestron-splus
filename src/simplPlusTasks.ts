import {
    workspace,
    window,
    tasks,
    Task,
    OutputChannel,
    TaskScope,
    ExtensionContext,
    TaskGroup,
    TaskPanelKind,
    ShellExecution,
    TaskDefinition,
    TaskRevealKind,
    TaskProvider,
    CancellationToken,
    Pseudoterminal,
    Event,
    TerminalDimensions,
    EventEmitter,
    Terminal,
    ShellExecutionOptions,
    ShellQuotedString,
    ShellQuoting,
} from "vscode";
import { getFileName } from "./helpers/helperFunctions";
import { BuildType } from "./base/build-type";
import * as path from "path";
import * as fs from 'fs';


export class SimplPlusTasks implements TaskProvider {
    static SimplPlusType: string = "simpl-plus";
    private simpPlusTasks: Task[] | undefined = undefined;
    // private simplPlusPromise: Thenable<Task[]> | undefined = undefined;
    private static _instance: SimplPlusTasks;
    // private _extensionTasks: Disposable | undefined;
    public static getInstance(ctx?: ExtensionContext): SimplPlusTasks {
        if (!SimplPlusTasks._instance) {
            SimplPlusTasks._instance = new SimplPlusTasks(ctx);
        }
        return SimplPlusTasks._instance;
    }

    private constructor(ctx?: ExtensionContext) {
        const workspaceRoot = (workspace.workspaceFolders && (workspace.workspaceFolders.length > 0))
            ? workspace.workspaceFolders[0].uri.fsPath : undefined;
        if (!workspaceRoot) {
            return;
        }
        const simplPlusFiles = path.join(workspaceRoot, "*.usp");
        const fileWatcher = workspace.createFileSystemWatcher(simplPlusFiles);
        // Simpl Plus task should only be displayed when there is a .usp file in the workspace.  
        // This will clear the list of tasks every time a .usp file is created or deleted.
        fileWatcher.onDidCreate(() => this.simpPlusTasks = undefined);
        fileWatcher.onDidDelete(() => this.simpPlusTasks = undefined);
        ctx?.subscriptions.push(
            fileWatcher
        );
    }

    public async provideTasks(token: CancellationToken): Promise<Task[]> {
        if (!this.simpPlusTasks) {
            this.simpPlusTasks = await this.getSimplPlusTasks();
        }
        return this.simpPlusTasks;
    }

    public resolveTask(task: Task, token: CancellationToken): Task | undefined {
        const buildTypes: BuildType[] = task.definition.buildTypes;
        const taskDefinition: SimplPlusTaskDefinition = <any>task.definition;

        let [label, _, execution] = this.getBuildParameters(taskDefinition.buildTypes, taskDefinition.files, taskDefinition.directory, taskDefinition.rebuild);
        let resolvedTask = this.TaskCreator(label, taskDefinition, execution);
        return resolvedTask;
    }

    //returns tasks only if there is a .usp file in the workspace
    private async getSimplPlusTasks(): Promise<Task[]> {
        const workspaceFolders = workspace.workspaceFolders;
        const result: Task[] = [];
        if (!workspaceFolders || workspaceFolders.length === 0) {
            return result;
        }
        let workspaceHasUsp = false;
        for (const workspaceFolder of workspaceFolders) {
            const folderString = workspaceFolder.uri.fsPath;
            if (!folderString) {
                continue;
            }
            if (!await this.uspExists(folderString)) {
                continue;
            }
            workspaceHasUsp = true;
        }
        if (!workspaceHasUsp) {
            return result;
        }
        let tasks: Task[] = [];
        let fileInfo = getFileName();
        if (fileInfo.name === "") {
            fileInfo.directory = workspaceFolders[0].uri.fsPath;
            fileInfo.name = "placeholder.usp";
        }
        if (!fileInfo.name.endsWith(".usp")) {
            fileInfo.name = "placeholder.usp";
        }

        let buildTypes: BuildType[] = [];
        buildTypes.push("Series2");
        buildTypes.push("Series3");
        buildTypes.push("Series4");

        let combinations = this.getBuildTaskCombinations(buildTypes);
        for (let combination of combinations) {
            if (combination.length === 0) { continue; }
            let [label, definition, execution] = this.getBuildParameters(combination, [fileInfo.name], fileInfo.directory);
            let task = this.TaskCreator(label, definition, execution);
            tasks.push(task);
        }
        tasks.sort((a, b) => a.name.localeCompare(b.name));
        return tasks;
    }

    private uspExists(folder: string): Promise<boolean> {
        return new Promise((resolve, reject) => {
            fs.readdir(folder, (err, files) => {
                if (err) {
                    resolve(false);
                }
                for (const file of files) {
                    if (file.endsWith(".usp")) {
                        resolve(true);
                    }
                }
                resolve(false);
            });
        });
    }

    private getBuildTaskCombinations(buildTypes: BuildType[]): BuildType[][] {
        let result: BuildType[][] = [];
        if (buildTypes.length === 0) {
            return result;
        }
        if (buildTypes.length === 1) {
            return [buildTypes];
        }
        function backtrack(start: number, current: BuildType[]) {
            result.push([...current]); // Add current combination to result
            for (let i = start; i < buildTypes.length; i++) {
                current.push(buildTypes[i]); // Add element to current combination
                backtrack(i + 1, current); // Recursively call backtrack
                current.pop(); // Remove last element from current combination
            }
        }
        backtrack(0, []);
        return result;
    }

    private getShellQuote(arg: string): ShellQuotedString {
        return {
            quoting: ShellQuoting.Strong,
            value: arg
        };
    }

    private getBuildParameters(buildType: BuildType[], fileNames: string[], directory: string, rebuild: boolean = false):
        [name: string, definition: SimplPlusTaskDefinition, execution: ShellExecution] {

        let commandArguments: ShellQuotedString[] = [];
        let seriesTargets: string[] = [];
        const dosExecutable = "C:\\Windows\\System32\\cmd.exe";
        const compilerPath = `${workspace.getConfiguration("simpl-plus").simplDirectory}\\SPlusCC.exe`;

        const compileCommand = rebuild ? "\\rebuild" : "\\build";
        commandArguments.push(this.getShellQuote(compileCommand));
        fileNames.forEach(fileName => {
            commandArguments.push(this.getShellQuote(`${fileName}`));
        });
        commandArguments.push(this.getShellQuote("\\target"));
        buildType.forEach(type => {
            commandArguments.push(this.getShellQuote(type.toLowerCase()));

        });

        let label = `Compile ${seriesTargets.join(" & ")} Series`;
        const definition: SimplPlusTaskDefinition = {
            type: SimplPlusTasks.SimplPlusType,
            buildTypes: buildType,
            files: fileNames,
            directory,
            rebuild
        };
        const command = this.getShellQuote(compilerPath);
        // setting ShellExecution Options so it runs on cmd.exe 
        // executable, the executable to run (cmd)
        // shellArgs, the arguments to pass to the executable for cmd  /C  Carries out the command specified by string and then terminates. cwd: current working directory
        const shellOptions: ShellExecutionOptions = { executable: dosExecutable, shellArgs: ["/C"], cwd: directory };
        const execution = new ShellExecution(command, commandArguments, shellOptions);
        return [label, definition, execution];
    }

    public async CompileCurrentSimplPlusFile(buildTypes: BuildType[], rebuild: boolean = false): Promise<void> {
        const fileInfo = getFileName();
        if (fileInfo.name === "") { return; }
        if (!fileInfo.name.endsWith(".usp")) {
            window.showErrorMessage("Active file is not a .usp file");
        }
        let [label, definition, execution] = this.getBuildParameters(buildTypes, [fileInfo.name], fileInfo.directory, rebuild);
        let task = this.TaskCreator(label, definition, execution);
        await tasks.executeTask(task);
    }

    private TaskCreator(name: string, definition: SimplPlusTaskDefinition, execution: ShellExecution): Task {
        const task = new Task(
            definition,
            TaskScope.Workspace,
            name,
            SimplPlusTasks.SimplPlusType,
            execution,
            ["$SIMPL+"]
        );
        task.group = TaskGroup.Build;
        task.presentationOptions = { reveal: TaskRevealKind.Always, panel: TaskPanelKind.Shared, focus: true, clear: false };
        return task;
    }
}

interface SimplPlusTaskDefinition extends TaskDefinition {
    type: string;
    buildTypes: BuildType[];
    files: string[];
    directory: string;
    rebuild: boolean;
}

