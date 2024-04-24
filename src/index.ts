import * as maquette from "maquette";
import * as advancedProjector from "maquette-advanced-projector";

import * as chip from "booyah/dist/chip";

export type RenderResult = maquette.VNode[];

export type RenderFunction = () => RenderResult;

export interface RenderableObject {
  render: RenderFunction;
}

export type Renderable = RenderResult | RenderFunction | RenderableObject;

function isRenderableObject(
  renderable: Renderable
): renderable is RenderableObject {
  return typeof (renderable as any).render === "function";
}

export function resolveRenderable(renderable: Renderable): RenderResult {
  if (typeof renderable === "function") return renderable();
  if (isRenderableObject(renderable)) return renderable.render();
  return renderable;
}

export class RenderableSet implements RenderableObject {
  private _children: Renderable[] = [];

  addChild(child: Renderable): void {
    if (this.hasChild(child)) throw new Error("Already contains child");

    this._children.push(child);
  }

  removeChild(child: Renderable): void {
    const index = this._children.indexOf(child);
    if (index === -1) throw new Error("Cannot find child to remove");

    this._children.splice(index, 1);
  }

  hasChild(child: Renderable): boolean {
    return this._children.includes(child);
  }

  render(): maquette.VNode[] {
    return this._children.flatMap(resolveRenderable);
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
    this._projector = advancedProjector.createAdvancedProjector({
      handleInterceptedEvent: (
        projector: advancedProjector.AdvancedProjector,
        vNode: maquette.VNode,
        node: Node,
        evt: Event
      ) => {
        // Don't call scheduleRender()

        return vNode.properties![`on${evt.type}`].apply(
          vNode.properties!.bind || node,
          [evt]
        );
      },
    });
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
