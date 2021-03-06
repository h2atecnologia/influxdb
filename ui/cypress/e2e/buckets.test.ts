import {Bucket, Organization} from '../../src/types'

describe('Buckets', () => {
  beforeEach(() => {
    cy.flush()

    cy.signin().then(({body}) => {
      const {
        org: {id},
        bucket,
      } = body
      cy.wrap(body.org).as('org')
      cy.wrap(bucket).as('bucket')
      cy.fixture('routes').then(({orgs, buckets}) => {
        cy.visit(`${orgs}/${id}${buckets}`)
      })
    })
  })

  describe('from the buckets index page', () => {
    it('can create a bucket', () => {
      const newBucket = '🅱️ucket'
      cy.getByTestID(`bucket--card--name ${newBucket}`).should('not.exist')

      cy.getByTestID('Create Bucket').click()
      cy.getByTestID('overlay--container').within(() => {
        cy.getByInputName('name').type(newBucket)
        cy.get('.cf-button')
          .contains('Create')
          .click()
      })

      cy.getByTestID(`bucket--card--name ${newBucket}`).should('exist')

      // Add a label
      cy.getByTestID('inline-labels--add')
        .first()
        .click()

      const labelName = 'l1'
      cy.getByTestID('inline-labels--popover--contents').type(labelName)
      cy.getByTestID('inline-labels--create-new').click()
      cy.getByTestID('create-label-form--submit').click()

      // Delete the label
      cy.getByTestID(`label--pill--delete ${labelName}`).click({force: true})
      cy.getByTestID('inline-labels--empty').should('exist')
    })

    it("can update a bucket's retention rules", () => {
      cy.get<Bucket>('@bucket').then(({name}: Bucket) => {
        cy.getByTestID(`bucket-settings`).click()
        cy.getByTestID(`bucket--card--name ${name}`).should(
          'not.contain',
          '7 days'
        )
      })

      cy.getByTestID('retention-intervals--button').click()
      cy.getByTestID('duration-selector--button').click()
      cy.getByTestID('duration-selector--7d').click()

      cy.getByTestID('overlay--container').within(() => {
        cy.contains('Save').click()
      })

      cy.get<Bucket>('@bucket').then(() => {
        cy.getByTestID(`bucket-retention`).should('contain', '7 days')
      })
    })

    describe('Searching and Sorting', () => {
      it('can sort by name and retention', () => {
        const buckets = ['defbuck', '_tasks', '_monitoring']
        cy.getByTestID('resource-sorter--button')
          .click()
          .then(() => {
            cy.getByTestID('resource-sorter--name-desc').click()
          })
          .then(() => {
            cy.get('[data-testid*="bucket-card"]').each((val, index) => {
              const testID = val.attr('data-testid')
              expect(testID).to.include(buckets[index])
            })
          })

        cy.getByTestID('resource-sorter--button')
          .click()
          .then(() => {
            cy.getByTestID(
              'resource-sorter--retentionRules[0].everySeconds-desc'
            ).click()
          })
          .then(() => {
            const asc_buckets = buckets
              .slice()
              .sort((a, b) => a.localeCompare(b))

            cy.get('[data-testid*="bucket-card"]').each((val, index) => {
              const testID = val.attr('data-testid')
              expect(testID).to.include(asc_buckets[index])
            })
          })

        cy.getByTestID('resource-sorter--button')
          .click()
          .then(() => {
            cy.getByTestID(
              'resource-sorter--retentionRules[0].everySeconds-asc'
            ).click()
          })
          .then(() => {
            const asc_buckets = buckets
              .slice()
              .sort((a, b) => a.localeCompare(b))

              .reverse()
            cy.get('[data-testid*="bucket-card"]').each((val, index) => {
              const testID = val.attr('data-testid')
              expect(testID).to.include(asc_buckets[index])
            })
          })

        cy.getByTestID('search-widget').type('tasks')
        cy.get('.cf-resource-card').should('have.length', 1)
      })
    })

    // Currently producing a false negative
    it.skip('can delete a bucket', () => {
      const bucket1 = 'newbucket1'
      cy.get<Organization>('@org').then(({id, name}: Organization) => {
        cy.createBucket(id, name, bucket1)
      })

      cy.getByTestID(`context-delete-menu ${bucket1}`).click()
      cy.getByTestID(`context-delete-bucket ${bucket1}`).click()

      // normally we would assert for empty state here
      // but we cannot because of the default system buckets
      // since cypress selectors are so fast, that sometimes a bucket
      // that is deleted will be selected before it gets deleted
      cy.wait(10000)

      cy.getByTestID(`bucket--card--name ${bucket1}`).should('not.exist')
    })
  })

  // skipping until feature flag feature is removed for deleteWithPredicate
  describe.skip('should default the bucket to the selected bucket', () => {
    beforeEach(() => {
      cy.get<Organization>('@org').then(({id, name}) => {
        cy.createBucket(id, name, 'Funky Town').then(() => {
          cy.createBucket(id, name, 'ABC').then(() => {
            cy.createBucket(id, name, 'Jimmy Mack')
          })
        })
      })
    })

    it('should set the default bucket in the dropdown to the selected bucket', () => {
      cy.getByTestID('bucket-delete-task')
        .first()
        .click()
        .then(() => {
          cy.getByTestID('dropdown--button').contains('ABC')
          cy.get('.cf-overlay--dismiss').click()
        })
        .then(() => {
          cy.getByTestID('bucket-delete-task')
            .last()
            .click()
            .then(() => {
              cy.getByTestID('dropdown--button').contains('Jimmy Mack')
            })
        })
    })

    it('alphabetizes buckets', () => {
      cy.getByTestID('bucket-delete-task')
        .first()
        .click()
        .then(() => {
          cy.getByTestID('dropdown--button')
            .contains('ABC')
            .click()
            .then(() => {
              // get the bucket list
              cy.get('.cf-dropdown-item--children')
                .should('have.length', 6)
                .then(el => {
                  const results = []
                  // output in an array
                  el.text((index, currentContent) => {
                    results[index] = currentContent
                  })
                  const expectedOrder = [
                    'ABC',
                    'defbuck',
                    'Funky Town',
                    'Jimmy Mack',
                    '_monitoring',
                    '_tasks',
                  ]
                  // check the order
                  expect(results).to.deep.equal(expectedOrder)
                })
            })
        })
    })
  })

  // skipping until feature flag feature is removed for deleteWithPredicate
  describe.skip('delete with predicate', () => {
    beforeEach(() => {
      cy.getByTestID('bucket-delete-task').click()
      cy.getByTestID('overlay--container').should('have.length', 1)
    })

    it('requires consent to perform delete with predicate', () => {
      // confirm delete is disabled
      cy.getByTestID('confirm-delete-btn').should('be.disabled')
      // checks the consent input
      cy.getByTestID('delete-checkbox').check({force: true})
      // can delete
      cy.getByTestID('confirm-delete-btn')
        .should('not.be.disabled')
        .click()
    })

    // this is currently not producing success, its actually failing, im going to write a separate issue for this
    it('closes the overlay upon a successful delete with predicate submission', () => {
      cy.getByTestID('delete-checkbox').check({force: true})
      cy.getByTestID('confirm-delete-btn').click()
      cy.getByTestID('overlay--container').should('not.exist')
      cy.getByTestID('notification-success').should('have.length', 1)
    })
    // needs relevant data in order to test functionality
    it.skip('should require key-value pairs when deleting predicate with filters', () => {
      // confirm delete is disabled
      cy.getByTestID('add-filter-btn').click()
      // checks the consent input
      cy.getByTestID('delete-checkbox').check({force: true})
      // cannot delete
      cy.getByTestID('confirm-delete-btn').should('be.disabled')

      // should display warnings
      cy.getByTestID('form--element-error').should('have.length', 2)

      // TODO: add filter values based on dropdown selection in key / value
    })
  })

  describe('Routing directly to the edit overlay', () => {
    it('reroutes to buckets view if bucket does not exist', () => {
      cy.get('@org').then(({id}: Organization) => {
        cy.fixture('routes').then(({orgs, buckets}) => {
          const idThatDoesntExist = '261234d1a7f932e4'
          cy.visit(`${orgs}/${id}${buckets}/${idThatDoesntExist}/edit`)
          cy.location('pathname').should('be', `${orgs}/${id}${buckets}/`)
        })
      })
    })

    it('displays overlay if bucket exists', () => {
      cy.get('@org').then(({id: orgID}: Organization) => {
        cy.fixture('routes').then(({orgs, buckets}) => {
          cy.get('@bucket').then(({id: bucketID}: Bucket) => {
            cy.visit(`${orgs}/${orgID}${buckets}/${bucketID}/edit`)
            cy.location('pathname').should(
              'be',
              `${orgs}/${orgID}${buckets}/${bucketID}/edit`
            )
          })
          cy.getByTestID(`overlay`).should('exist')
        })
      })
    })
  })

  describe('add data', function() {
    it('can write data to buckets', () => {
      cy.get('@org').then(({id: orgID}: Organization) => {
        // writing a well-formed line is accepted
        cy.getByTestID('add-data--button').click()
        cy.getByTestID('bucket-add-client-library').click()
        cy.location('pathname').should(
          'be',
          `/orgs/${orgID}/load-data/client-libraries`
        )
        cy.go('back')
        cy.getByTestID('add-data--button').click()

        cy.getByTestID('bucket-add-line-protocol').click()
        cy.getByTestID('Enter Manually').click()
        cy.getByTestID('lp-write-data--button').should('be.disabled')
        cy.getByTestID('line-protocol--text-area').type('m1,t1=v1 v=1.0')
        cy.getByTestID('lp-write-data--button').click()
        cy.getByTestID('line-protocol--status').contains('Success')
        cy.getByTestID('lp-close--button').click()

        // writing a poorly-formed line errors
        cy.getByTestID('add-data--button').click()
        cy.getByTestID('bucket-add-line-protocol').click()
        cy.getByTestID('Enter Manually').click()
        cy.getByTestID('line-protocol--text-area').type('invalid invalid')
        cy.getByTestID('lp-write-data--button').click()
        cy.getByTestID('line-protocol--status').contains('Unable')
        cy.getByTestID('lp-cancel--button').click()

        // writing a well-formed line with millisecond precision is accepted
        cy.getByTestID('wizard-step--lp-precision--dropdown').click()
        cy.getByTestID('wizard-step--lp-precision-ms').click()
        const now = Date.now()
        cy.getByTestID('line-protocol--text-area').type(`m2,t2=v2 v=2.0 ${now}`)
        cy.getByTestID('lp-write-data--button').click()
        cy.getByTestID('line-protocol--status').contains('Success')
      })
    })

    it('upload a file and write data', () => {
      cy.getByTestID('add-data--button').click()
      cy.getByTestID('bucket-add-line-protocol').click()
      cy.getByTestID('Upload File').click()

      // When a file is larger than 10MB
      const bigFile = 'data-big.txt'
      const type = 'plain/text'
      const testFile = new File(
        ['a'.repeat(1e7) + 'just a bit over 10mb'],
        bigFile,
        {type}
      )
      const event = {dataTransfer: {files: [testFile]}, force: true}
      cy.getByTestID('drag-and-drop--input')
        .trigger('dragover', event)
        .trigger('drop', event)

      cy.getByTestID('dnd--header-error').contains(bigFile)
      cy.getByTestID('cancel-upload--button').click()

      cy.getByTestID('wizard-step--lp-precision--dropdown').click()
      cy.getByTestID('wizard-step--lp-precision-ms').click()
      cy.getByTestID('wizard-step--lp-precision--dropdown').contains(
        'Milliseconds'
      )

      // When a file is the correct size
      const smallFile = 'data.txt'
      cy.fixture(smallFile, 'base64')
        .then(Cypress.Blob.base64StringToBlob)
        .then(blob => {
          const type = 'plain/text'
          const testFile = new File([blob], smallFile, {type})
          const event = {dataTransfer: {files: [testFile]}, force: true}
          cy.getByTestID('drag-and-drop--input')
            .trigger('dragover', event)
            .trigger('drop', event)
        })

      cy.getByTestID('write-data--button').click()
      cy.getByTestID('lp-close--button').click()

      // navigate to data explorer to see data
      cy.getByTestID('nav-item-data-explorer').click({force: true})
      cy.getByTestID('timerange-dropdown').click()
      cy.getByTestID('dropdown-item-customtimerange').click()

      // time range start
      cy.getByTestID('timerange--input')
        .first()
        .clear()
        .type('2020-08-06 00:00:00.000')

      // time range stop
      cy.getByTestID('timerange--input')
        .last()
        .clear()
        .type('2020-08-08 00:00:00.000')

      cy.getByTestID('daterange--apply-btn').click()

      cy.fixture('user.json').then(({bucket}) => {
        cy.getByTestID(`selector-list ${bucket}`).click()
        // mymeasurement comes from fixtures/data.txt
        cy.getByTestID('selector-list mymeasurement').should('exist')
      })
    })
  })
})
