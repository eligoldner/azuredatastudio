/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the Source EULA. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as azdata from 'azdata';

import * as vsEvent from 'vs/base/common/event';
import { createDecorator } from 'vs/platform/instantiation/common/instantiation';
import { URI } from 'vs/base/common/uri';
import { RenderMimeRegistry } from 'sql/workbench/contrib/notebook/browser/outputs/registry';
import { ModelFactory } from 'sql/workbench/contrib/notebook/browser/models/modelFactory';
import { IConnectionProfile } from 'sql/platform/connection/common/interfaces';
import { NotebookInput } from 'sql/workbench/contrib/notebook/browser/models/notebookInput';
import { ISingleNotebookEditOperation } from 'sql/workbench/api/common/sqlExtHostTypes';
import { ICellModel, INotebookModel } from 'sql/workbench/contrib/notebook/browser/models/modelInterfaces';
import { NotebookChangeType, CellType } from 'sql/workbench/contrib/notebook/common/models/contracts';
import { IBootstrapParams } from 'sql/workbench/services/bootstrap/common/bootstrapParams';

export const SERVICE_ID = 'notebookService';
export const INotebookService = createDecorator<INotebookService>(SERVICE_ID);

export const DEFAULT_NOTEBOOK_PROVIDER = 'builtin';
export const DEFAULT_NOTEBOOK_FILETYPE = 'IPYNB';
export const SQL_NOTEBOOK_PROVIDER = 'sql';
export const OVERRIDE_EDITOR_THEMING_SETTING = 'notebook.overrideEditorTheming';

export interface ILanguageMagic {
	magic: string;
	language: string;
	kernels?: string[];
	executionTarget?: string;
}

export interface INotebookService {
	_serviceBrand: undefined;

	readonly onNotebookEditorAdd: vsEvent.Event<INotebookEditor>;
	readonly onNotebookEditorRemove: vsEvent.Event<INotebookEditor>;
	onNotebookEditorRename: vsEvent.Event<INotebookEditor>;

	readonly isRegistrationComplete: boolean;
	readonly registrationComplete: Promise<void>;
	readonly languageMagics: ILanguageMagic[];
	/**
	 * Register a metadata provider
	 */
	registerProvider(providerId: string, provider: INotebookProvider): void;

	/**
	 * Register a metadata provider
	 */
	unregisterProvider(providerId: string): void;

	registerNavigationProvider(provider: INavigationProvider): void;

	getNavigationProvider(notebookUri: URI): INavigationProvider;

	getSupportedFileExtensions(): string[];

	getProvidersForFileType(fileType: string): string[];

	getStandardKernelsForProvider(provider: string): azdata.nb.IStandardKernel[];

	/**
	 * Initializes and returns a Notebook manager that can handle all important calls to open, display, and
	 * run cells in a notebook.
	 * @param providerId ID for the provider to be used to instantiate a backend notebook service
	 * @param uri URI for a notebook that is to be opened. Based on this an existing manager may be used, or
	 * a new one may need to be created
	 */
	getOrCreateNotebookManager(providerId: string, uri: URI): Thenable<INotebookManager>;

	addNotebookEditor(editor: INotebookEditor): void;

	removeNotebookEditor(editor: INotebookEditor): void;

	listNotebookEditors(): INotebookEditor[];

	findNotebookEditor(notebookUri: URI): INotebookEditor | undefined;

	getMimeRegistry(): RenderMimeRegistry;

	renameNotebookEditor(oldUri: URI, newUri: URI, currentEditor: INotebookEditor): void;

	/**
	 * Checks if a notebook has previously been marked as trusted, and that
	 * the notebook has not changed on disk since that time. If the notebook
	 * is currently dirty in the app, the previous trusted state will be used even
	 * if it's altered on disk since the version in our UI is based on previously trusted
	 * content.
	 * @param notebookUri the URI identifying a notebook
	 * @param isDirty is the notebook marked as dirty in by the text model trackers?
	 */
	isNotebookTrustCached(notebookUri: URI, isDirty: boolean): Promise<boolean>;
	/**
	 * Serializes an impactful Notebook state change. This will result
	 * in trusted state being serialized if needed, and notifications being
	 * sent to listeners that can act on the point-in-time notebook state
	 * @param notebookUri the URI identifying a notebook
	 */
	serializeNotebookStateChange(notebookUri: URI, changeType: NotebookChangeType, cell?: ICellModel): void;

	/**
	 *
	 * @param notebookUri URI of the notebook to navigate to
	 * @param sectionId ID of the section to navigate to
	 */
	navigateTo(notebookUri: URI, sectionId: string): void;
}

export interface INotebookProvider {
	readonly providerId: string;
	getNotebookManager(notebookUri: URI): Thenable<INotebookManager>;
	handleNotebookClosed(notebookUri: URI): void;
}

export interface INotebookManager {
	providerId: string;
	readonly contentManager: azdata.nb.ContentManager;
	readonly sessionManager: azdata.nb.SessionManager;
	readonly serverManager: azdata.nb.ServerManager;
}

export interface IProviderInfo {
	providerId: string;
	providers: string[];
}
export interface INotebookParams extends IBootstrapParams {
	notebookUri: URI;
	input: NotebookInput;
	providerInfo: Promise<IProviderInfo>;
	profile?: IConnectionProfile;
	modelFactory?: ModelFactory;
}

/**
 * Defines a section in a notebook as the header text for that section,
 * the relative URI that can be used to link to it inside Notebook documents
 */
export interface INotebookSection {
	header: string;
	relativeUri: string;
}

export interface INotebookEditor {
	readonly notebookParams: INotebookParams;
	readonly id: string;
	readonly cells?: ICellModel[];
	readonly modelReady: Promise<INotebookModel>;
	readonly model: INotebookModel | null;
	isDirty(): boolean;
	isActive(): boolean;
	isVisible(): boolean;
	executeEdits(edits: ISingleNotebookEditOperation[]): boolean;
	runCell(cell: ICellModel): Promise<boolean>;
	runAllCells(startCell?: ICellModel, endCell?: ICellModel): Promise<boolean>;
	clearOutput(cell: ICellModel): Promise<boolean>;
	clearAllOutputs(): Promise<boolean>;
	getSections(): INotebookSection[];
	navigateToSection(sectionId: string): void;
	addCell(cellType: CellType, index?: number, event?: Event);
}

export interface INavigationProvider {
	providerId: string;
	hasNavigation: boolean;
	getNavigation(uri: URI): Thenable<azdata.nb.NavigationResult>;
	onNext(uri: URI): void;
	onPrevious(uri: URI): void;
}
