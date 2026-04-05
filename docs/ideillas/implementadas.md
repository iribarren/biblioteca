# Crear documentacion de la API

Documenta la api utilizando la especificacion OpenApi

La documentacion debe incluir toda la informacion sobre los endpoints, los datos de entrada y salida.

Se debe incluir una pagina en la que consultar toda esta informacion con swaggerUI(consulta la mejor forma de utilizarlo con symfony)

Modificar el agente de backend para que cada vez que se añada o modifique un endpoint de la API actualice la documentacion

# Estilos custom dependiendo del genero de la partida

Deberia existir distintas temas de la interfaz dependiendo del genero o epoca que se haya seleccionado
tienen que existir por lo menos 6 temas
Cada genero o epoca estara relacionado con uno de los temas, siendo posible que un tema este relacionado con varios generos o epocas
Si el genero y la epoca tienen asignado un tema distinto, dar prioridad al tema asignado a la epoca
Al entrar a la pantalla de inicio, si no hay un juego en marcha, se mostrara uno de los temas al azar

# Mejorar stack para permitir añadir nuevos modo de juego y mejorar gestion de partidas guardadas

Migrar el frontend un framework moderno de javascript para permitir añadir otros modos de juego

Vamos a añadir nuevos modos de juegos basados en las mismas mecanicas básicas de descubrir libros, tiradas de dados y escritura de dados.

Tiene sentido que tengamos componentes reutilizables en los distintos modos de juego.

Analizar que framework puede ser más interesante

El modo de juego actual pasara a llamarse "Aventura Rapida", y mantendra la estructura de capitulos y epilogo

De cara a hacer los componentes reutilizablez, considera que otros modos de juego tendran otros flujos, por ejemplo es posible que se descubran libros que solo impliquen añadir una entrada al diario, que se tengan que añadir entradas al diario por otro motivo, o que se tengan que realizar tiradas de manera independiente

Antes de realizar un plan de migracion completo, ofrece las diferencias que habria entre utilizar un framework u otro, y una vez eliga el framework, realiza un plan de migracion

# Securizar API

Analiza como securizar la API

Tienen que existir endpoints que sean publicos y esten disponibles para todo el mundo

Otros endpoints por el contrario necesitan de un token generado para un usuario registrado para ser utilizados

Dentro de los endpoints disponibles para usuarios, la visibilidad de los endpoints dependerá también del rol del usuario

En la pantalla de documentación de la API solo estaran visibles los endpoints que son completamente publicos

Si un usuario con el rol admin que haya iniciado sesión en el admin accede a la pantalla de documentación de la API sí que verá todos los endpoints

En el plan añade una tabla con los endpoints actuales para indicar la visibilidad que deben tener

Existiran tres roles: admin, jugador, creador

En principio los endpoints que tengan que ver con el jugador y la partida, tendran que poder ser usados por usuarios con el rol jugador

Los endpoints que tengan que ver con oraculos y tiradas de dados tendran sus operaciones de consulta visibles para todo el mundo, las operaciones de creacion estaran limitadas a usuarios con el rol creador y admin

# Mejorar UX para partidas guardadas. Solo mostrar las persistidas en BBDD en el 

el almacenamiento local solo deberia servir para la partida en marcha, una vez se sale se tendria que borrar

mantener persistencia en BBDD si es un usuario registrado

eliminar el actual bloque de la portada que muestra las "Partidas Guardadas" desde el almacenamiento