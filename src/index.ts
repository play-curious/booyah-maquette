import * as maquette from "maquette";

import * as chip from "booyah/src/chip";

export type RenderFunction = () => maquette.VNode[];

export type Renderable = {
  render: RenderFunction;
};

export class RenderableFunctionWrapper implements Renderable {
  constructor(private readonly _renderFunction: RenderFunction) {}

  render(): maquette.VNode[] {
    return this._renderFunction();
  }
}

export class RenderableSet implements Renderable {
  private _children: Renderable[] = [];

  addChild(child: Renderable): void {
    if (this.hasChild(child)) throw new Error("Already contains child");

    this._children.push(child);
  }

  removeChild(child: Renderable): void {
    const index = this._children.indexOf(child);
    if (index === -1) throw new Error("Cannot find child to remove");

    this._children.splice(index);
  }

  hasChild(child: Renderable): boolean {
    return this._children.includes(child);
  }

  render(): maquette.VNode[] {
    return this._children.flatMap((child) => child.render());
  }
}

export class RenderableChip extends chip.ChipBase {
  constructor(private readonly _renderable: Renderable) {
    super();
  }

  protected _onActivate() {
    this._chipContext.renderableSet.addChild(this._renderable);
  }

  protected _onTerminate() {
    this._chipContext.renderableSet.removeChild(this._renderable);
  }
}

class ProjectorOptions {
  selector = "div";
  properties: maquette.VNodeProperties = {};
  contextKey = "renderableSet";
}

export class Projector extends chip.ChipBase {
  private _options: ProjectorOptions;
  private _projector?: maquette.Projector;
  private _renderFunction?: () => maquette.VNode;

  constructor(
    private readonly _parentNode: Element,
    options?: Partial<ProjectorOptions>
  ) {
    super();

    this._options = chip.fillInOptions(options, new ProjectorOptions());
  }

  protected _onActivate(): void {
    this._projector = maquette.createProjector();
    this._renderFunction = () =>
      maquette.h(
        this._options.selector,
        this._options.properties,
        this.chipContext[this._options.contextKey].render()
      );
    this._projector.append(this._parentNode, this._renderFunction);
  }

  protected _onTerminate(): void {
    this._projector!.detach(this._renderFunction!);
    delete this._renderFunction;
    delete this._projector;
  }

  protected _onTick(): void {
    this._projector!.scheduleRender();
  }
}
