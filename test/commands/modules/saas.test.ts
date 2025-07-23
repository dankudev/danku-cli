import {runCommand} from '@oclif/test'
import {expect} from 'chai'

describe('modules:saas', () => {
  it('runs modules:saas cmd', async () => {
    const {stdout} = await runCommand('modules:saas')
    expect(stdout).to.contain('hello world')
  })

  it('runs modules:saas --name oclif', async () => {
    const {stdout} = await runCommand('modules:saas --name oclif')
    expect(stdout).to.contain('hello oclif')
  })
})
