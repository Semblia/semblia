import { Injectable, NotImplementedException } from "@nestjs/common";
import type {
  CreateFormBodyDto,
  FormIdParamsDto,
  ProjectFormsParamsDto,
  PublicFormSubmissionBodyDto,
  UpdateFormBodyDto,
} from "./forms.dto.js";

@Injectable()
export class FormsService {
  list(_userId: string, _params: ProjectFormsParamsDto) {
    throw new NotImplementedException("forms.list not implemented");
  }

  create(_userId: string, _body: CreateFormBodyDto) {
    throw new NotImplementedException("forms.create not implemented");
  }

  getById(_userId: string, _params: FormIdParamsDto) {
    throw new NotImplementedException("forms.getById not implemented");
  }

  update(_userId: string, _params: FormIdParamsDto, _body: UpdateFormBodyDto) {
    throw new NotImplementedException("forms.update not implemented");
  }

  delete(_userId: string, _params: FormIdParamsDto) {
    throw new NotImplementedException("forms.delete not implemented");
  }

  submitPublic(_params: FormIdParamsDto, _body: PublicFormSubmissionBodyDto) {
    throw new NotImplementedException("forms.submitPublic not implemented");
  }
}
