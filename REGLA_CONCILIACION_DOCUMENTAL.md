# Regla de conciliación documental

## Fuente de verdad económica

La **factura siempre prevalece sobre la cotización**.

- La cotización registra el alcance y el valor propuesto.
- La factura acredita un cobro real y es la fuente del costo ejecutado.
- No se descarta una factura porque su valor coincida con una cotización: puede corresponder al proyecto, a un ajuste o a un cobro adicional.
- Cuando un proyecto tiene varias facturas distintas, el costo final corresponde a la suma de todas las facturas únicas vinculadas.
- Una copia repetida del mismo PDF o de la misma factura no se suma nuevamente.
- La cotización nunca se suma al costo facturado.
- Si solo existe cotización, el proyecto permanece en seguimiento y no se registra costo ejecutado.

## Estados

### Con factura

- Estado: `Finalizado`
- Avance: `100 %`
- `costo_proyecto`: suma de facturas únicas
- `valor_cotizado`: referencia comercial, cuando exista

### Solo con cotización

- Estado: `En seguimiento`
- Avance: `0 %`
- `costo_proyecto`: sin registrar
- `valor_cotizado`: valor de referencia, cuando exista una versión inequívoca

## Trazabilidad

Cada archivo se registra en `documentos_proyecto` con:

- carpeta de origen;
- tipo de documento;
- proveedor;
- número y fecha;
- valor;
- proyecto relacionado;
- indicador de duplicado;
- documento principal cuando sea una copia;
- indicador de inclusión o exclusión del costo.

El cálculo del costo se actualiza automáticamente mediante un trigger de base de datos para impedir que una cotización reemplace una factura o que un duplicado se contabilice dos veces.

## Auditoría de las cuatro carpetas

- Archivos revisados: 77
- Facturas físicas: 22
- Facturas únicas contabilizadas: 21
- Cotizaciones: 48
- Soportes administrativos: 7
- Duplicados detectados y enlazados: 7
- Documentos comerciales sin proyecto: 0
- Documentos pendientes de revisión: 0
- Proyectos con factura: 21
- Proyectos solo con cotización: 15
- Costo facturado consolidado: COP 70.148.050
