import { ExtensionContext } from 'vscode';
import { LanguageClient } from 'vscode-languageclient/node';
import { getClient } from './client';

let client: LanguageClient;

export async function activate(context: ExtensionContext) {
	client = await getClient(context);
	client.start();
}

export function deactivate(): Thenable<void> | undefined {
	if (!client) {
		return undefined;
	}
	return client.stop();
}