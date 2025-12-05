import { Controller } from '@nestjs/common';
import { ListsService } from './lists.service';

@Controller('allowlists')
export class ListsController {
  constructor(private readonly listsService: ListsService) {}
  // Placeholder - implement endpoints
}
