import { render, fireEvent } from '@testing-library/svelte'
import NewProjectDialog from './NewProjectDialog.svelte'
import Dexie from 'dexie'
import DexieService from '../../services/database/dexie-service'

// Mock DexieService
jest.mock('../../services/database/dexie-service', () => ({
  queryRecords: jest.fn()
}))

// Mock Dexie
jest.mock('dexie', () => {
  return class {
    open = jest.fn()
    table = jest.fn(() => ({
      add: jest.fn()
    }))
  }
})

describe('NewProjectDialog', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should load templates from database or fallback', async () => {
    const mockTemplates = [{ id: 'custom', name: 'Custom Template' }]
    DexieService.queryRecords.mockResolvedValue(mockTemplates)

    const { component } = render(NewProjectDialog)
    await new Promise(resolve => setTimeout(resolve, 0))

    expect(DexieService.queryRecords).toHaveBeenCalledWith('qi-qiao-ban', 'templates')
    expect(component.templates).toEqual(mockTemplates)
  })

  it('should use fallback templates if database returns empty', async () => {
    DexieService.queryRecords.mockResolvedValue([])

    const { component } = render(NewProjectDialog)
    await new Promise(resolve => setTimeout(resolve, 0))

    expect(component.templates.length).toBeGreaterThan(0)
    expect(component.templates[0].id).toBe('blank')
  })

  it('should validate project name on confirm', async () => {
    const { getByText, getByPlaceholderText } = render(NewProjectDialog)
    const confirmButton = getByText('确定')
    const input = getByPlaceholderText('请输入项目名称')

    // Test empty name
    await fireEvent.click(confirmButton)
    expect(alert).toHaveBeenCalledWith('请输入项目名称')

    // Test valid name
    jest.spyOn(window, 'alert').mockClear()
    await fireEvent.input(input, { target: { value: 'Test Project' } })
    await fireEvent.click(confirmButton)
    expect(alert).not.toHaveBeenCalled()
  })

  it('should dispatch confirm event with project name', async () => {
    const { getByText, getByPlaceholderText, component } = render(NewProjectDialog)
    const confirmButton = getByText('确定')
    const input = getByPlaceholderText('请输入项目名称')

    await fireEvent.input(input, { target: { value: 'Test Project' } })
    await fireEvent.click(confirmButton)

    expect(component.$$.callbacks['confirm']).toBeTruthy()
  })

  it('should dispatch cancel event', async () => {
    const { getByText, component } = render(NewProjectDialog)
    const cancelButton = getByText('取消')

    await fireEvent.click(cancelButton)
    expect(component.$$.callbacks['cancel']).toBeTruthy()
  })

  it('should update selected template on click', async () => {
    const { getAllByRole, component } = render(NewProjectDialog)
    const templateButtons = getAllByRole('button').filter(btn => btn.className.includes('tpl-btn'))

    await fireEvent.click(templateButtons[1])
    expect(component.selected).not.toBe('blank')
  })
})