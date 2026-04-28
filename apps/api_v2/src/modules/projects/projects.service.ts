import { Injectable, NotImplementedException } from "@nestjs/common";
import type {
  CreateProjectBodyDto,
  ListProjectsQueryDto,
  ProjectSlugParamsDto,
  UpdateProjectBodyDto,
} from "./projects.dto.js";

@Injectable()
export class ProjectsService {
  list(_userId: string, _query: ListProjectsQueryDto) {
    throw new NotImplementedException("projects.list not implemented");
  }

  create(_userId: string, _body: CreateProjectBodyDto) {
    throw new NotImplementedException("projects.create not implemented");
  }

  getBySlug(_userId: string, _params: ProjectSlugParamsDto) {
    throw new NotImplementedException("projects.getBySlug not implemented");
  }

  update(_userId: string, _params: ProjectSlugParamsDto, _body: UpdateProjectBodyDto) {
    throw new NotImplementedException("projects.update not implemented");
  }

  delete(_userId: string, _params: ProjectSlugParamsDto) {
    throw new NotImplementedException("projects.delete not implemented");
  }
}
