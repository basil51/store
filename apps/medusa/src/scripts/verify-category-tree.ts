import { ExecArgs } from "@medusajs/framework/types"
import { createProductCategoriesWorkflow } from "@medusajs/medusa/core-flows"

export default async function verifyCategoryTree({ container, args }: ExecArgs) {
  const apiBase = args[0] ?? "http://127.0.0.1:9244"
  const publishableApiKey = args[1] ?? process.env.STORE_PUBLISHABLE_KEY

  if (!publishableApiKey) {
    throw new Error(
      "Missing publishable API key. Pass as second arg: medusa exec ./src/scripts/verify-category-tree.ts <apiBase> <publishableKey>"
    )
  }

  const suffix = Date.now().toString()
  const rootHandle = `verify-root-${suffix}`

  const {
    result: [root],
  } = await createProductCategoriesWorkflow(container).run({
    input: {
      product_categories: [
        {
          name: `Verify Root ${suffix}`,
          handle: rootHandle,
          is_active: true,
        },
      ],
    },
  })

  const {
    result: [child],
  } = await createProductCategoriesWorkflow(container).run({
    input: {
      product_categories: [
        {
          name: `Verify Child ${suffix}`,
          handle: `verify-child-${suffix}`,
          parent_category_id: root.id,
          is_active: true,
        },
      ],
    },
  })

  await createProductCategoriesWorkflow(container).run({
    input: {
      product_categories: [
        {
          name: `Verify Grandchild ${suffix}`,
          handle: `verify-grandchild-${suffix}`,
          parent_category_id: child.id,
          is_active: true,
        },
      ],
    },
  })

  const rootQuery = new URLSearchParams({
    handle: rootHandle,
    fields: "*category_children,handle",
  })

  const response = await fetch(
    `${apiBase}/store/product-categories?${rootQuery.toString()}`,
    {
      headers: {
        "x-publishable-api-key": publishableApiKey,
      },
    }
  )

  if (!response.ok) {
    const errorBody = await response.text()
    throw new Error(
      `Store API request failed: ${response.status} ${response.statusText} - ${errorBody}`
    )
  }

  const data = (await response.json()) as {
    product_categories?: Array<{
      handle?: string
      category_children?: Array<{
        handle?: string
        category_children?: Array<{ handle?: string }>
      }>
    }>
  }

  const rootCategory = data.product_categories?.[0]
  const firstChild = rootCategory?.category_children?.[0]
  const firstGrandchild = firstChild?.category_children?.[0]

  if (!rootCategory || !firstChild) {
    throw new Error(
      "Category verification failed: expected at least root -> child in Store API response"
    )
  }

  // Some store field selections don't inline grandchildren. Fallback to child handle check.
  if (!firstGrandchild) {
    if (!firstChild.handle) {
      throw new Error(
        "Category verification failed: child handle missing, cannot verify grandchild"
      )
    }

    const childQuery = new URLSearchParams({
      handle: firstChild.handle,
      fields: "*category_children,handle",
    })

    const childResponse = await fetch(
      `${apiBase}/store/product-categories?${childQuery.toString()}`,
      {
        headers: {
          "x-publishable-api-key": publishableApiKey,
        },
      }
    )

    if (!childResponse.ok) {
      const errorBody = await childResponse.text()
      throw new Error(
        `Store API child request failed: ${childResponse.status} ${childResponse.statusText} - ${errorBody}`
      )
    }

    const childData = (await childResponse.json()) as {
      product_categories?: Array<{
        handle?: string
        category_children?: Array<{ handle?: string }>
      }>
    }

    const childCategory = childData.product_categories?.[0]
    const grandchildFromChildRequest = childCategory?.category_children?.[0]

    if (!grandchildFromChildRequest) {
      throw new Error(
        "Deep category verification failed: expected grandchild under child in Store API response"
      )
    }

    console.log("Category tree verification passed")
    console.log(`Root handle: ${rootCategory.handle}`)
    console.log(`Child handle: ${firstChild.handle}`)
    console.log(`Grandchild handle: ${grandchildFromChildRequest.handle}`)
    return
  }

  console.log("Category tree verification passed")
  console.log(`Root handle: ${rootCategory.handle}`)
  console.log(`Child handle: ${firstChild.handle}`)
  console.log(`Grandchild handle: ${firstGrandchild.handle}`)
}
