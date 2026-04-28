import { Injectable, NotImplementedException } from "@nestjs/common";
import type {
  CreateWidgetBodyDto,
  ProjectWidgetsParamsDto,
  UpdateWidgetBodyDto,
  WallSlugParamsDto,
  WidgetIdParamsDto,
} from "./widgets.dto.js";

@Injectable()
export class WidgetsService {
  list(_userId: string, _params: ProjectWidgetsParamsDto) {
    throw new NotImplementedException("widgets.list not implemented");
  }

  create(_userId: string, _body: CreateWidgetBodyDto) {
    throw new NotImplementedException("widgets.create not implemented");
  }

  update(_userId: string, _params: WidgetIdParamsDto, _body: UpdateWidgetBodyDto) {
    throw new NotImplementedException("widgets.update not implemented");
  }

  delete(_userId: string, _params: WidgetIdParamsDto) {
    throw new NotImplementedException("widgets.delete not implemented");
  }

  getPublic(_params: WidgetIdParamsDto) {
    throw new NotImplementedException("widgets.getPublic not implemented");
  }

  getPublicWall(_params: WallSlugParamsDto) {
    throw new NotImplementedException("widgets.getPublicWall not implemented");
  }

  renderEmbed(_params: WidgetIdParamsDto) {
    throw new NotImplementedException("widgets.renderEmbed not implemented");
  }
}
