migrate((app) => {
  const collection = new Collection({
    name: "analyses",
    type: "base",
    listRule: "@request.auth.id != ''",
    viewRule: "@request.auth.id != ''",
    createRule: "@request.auth.id != ''",
    updateRule: "@request.auth.id != ''",
    deleteRule: "@request.auth.id != ''"
  });

  collection.fields.add(new TextField({
    name: "userId",
    required: true
  }));

  collection.fields.add(new TextField({
    name: "fileName",
    required: true
  }));

  collection.fields.add(new TextField({
    name: "fileType",
    required: true
  }));

  collection.fields.add(new FileField({
    name: "uploadedFile",
    maxSelect: 1,
    maxSize: 104857600 // 100MB
  }));

  collection.fields.add(new TextField({
    name: "result",
    required: true
  }));

  collection.fields.add(new NumberField({
    name: "confidence",
    required: true
  }));

  collection.fields.add(new TextField({
    name: "riskLevel",
    required: true
  }));

  collection.fields.add(new JSONField({
    name: "audioAnalysis"
  }));

  collection.fields.add(new JSONField({
    name: "visualAnalysis"
  }));

  collection.fields.add(new JSONField({
    name: "contentAnalysis"
  }));

  collection.fields.add(new TextField({
    name: "summary"
  }));

  collection.fields.add(new AutodateField({
    name: "created",
    onCreate: true,
    onUpdate: false
  }));

  collection.fields.add(new AutodateField({
    name: "updated",
    onCreate: true,
    onUpdate: true
  }));

  return app.save(collection);
}, (app) => {
  try {
    const collection = app.findCollectionByNameOrId("analyses");
    return app.delete(collection);
  } catch (e) {
    return null;
  }
});
