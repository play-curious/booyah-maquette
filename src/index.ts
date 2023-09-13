import * as maquette from "maquette";

import * as chip from "booyah/src/chip";

export type RenderFunction = () => maquette.VNode;
export type DomComponentChild =
  | maquette.VNodeChild
  | DomComponent
  | RenderFunction;

export class DomComponentOptions {
  selector: string = "span";
  properties: maquette.VNodeProperties = {};
  children: DomComponentChild[] = [];
}

export class DomComponent {
  private _options: DomComponentOptions;

  constructor(options?: Partial<DomComponentOptions>) {
    this._options = chip.fillInOptions(options, new DomComponentOptions());
  }

  render(): maquette.VNode {
    const renderedChildren = this._options.children.map((child) => {
      if (child instanceof DomComponent) return child.render();
      else if (typeof child === "function") return child();
      else return child;
    });
    return maquette.h(
      this._options.selector,
      this._options.properties,
      renderedChildren
    );
  }

  addChild(child: maquette.VNodeChild): void {
    this._options.children.push(child);
  }

  removeChild(child: maquette.VNodeChild): void {
    const index = this._options.children.indexOf(child);
    if (index === -1) throw new Error("Cannot find child to remove");

    this._options.children.splice(index);
  }
}

export class DomChip extends chip.ChipBase {
  constructor(private readonly _component: DomComponent) {
    super();
  }

  protected _onActivate() {
    this._chipContext.domComponent.addChild(this._component);
  }

  protected _onTerminate() {
    this._chipContext.domComponent.removeChild(this._component);
  }
}

export class Projector extends chip.ChipBase {
  private _projector?: maquette.Projector;
  private _renderFunction?: () => maquette.VNode;

  constructor(private readonly _parentNode: Element) {
    super();
  }

  protected _onActivate(): void {
    this._projector = maquette.createProjector();
    this._renderFunction = () => this.chipContext.domComponent.render();
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
