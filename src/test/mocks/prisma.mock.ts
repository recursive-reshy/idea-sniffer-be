export const mockPrismaService = {
  run: {
    create:   jest.fn(),
    update:   jest.fn(),
    findMany: jest.fn(),
    count:    jest.fn(),
  },
  bronzeRecord: {
    create:     jest.fn(),
    createMany: jest.fn(),
    findMany:   jest.fn(),
    update:     jest.fn(),
  },
  filterRun: {
    create:   jest.fn(),
    update:   jest.fn(),
    findMany: jest.fn(),
    count:    jest.fn(),
  },
  silverSignal: {
    create:   jest.fn(),
    findMany: jest.fn(),
    count:    jest.fn(),
  },
}
