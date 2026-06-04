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

# Añadir popup informativo junto a la opcion de nueva partida que describa las instrucciones de juego

Añade un boton o icono independiente a la derecha del boton Nueva Partida que despliegue un pop-up con una explicacion del juego. La explicación tiene que estar en ambos idiomas en los que esta la aplicación actualmente.

En el popup aparecera una explicacion del juego, y del flujo. Se explicara el funcionamiento de las jugadas.

La biblioteca es un juego de rol solitario de tipo diario, en el que prima la imaginación.

La premisa del juego es que el jugador accede a una biblioteca imaginaria que representa su mente y los libros son sus recuerdos. 

El juego se divide en Prologo, Capitulos y Epilogo

En el prologo el jugador decide la ambientación de la partida, y describe en el diario como es la biblioteca que representa su mente

En los capitulos, el jugador explora libros de la biblioteca, y a partir de las caracteristicas del libro, tiene que imaginar una situacion de su pasado, seleccionar como se enfrento a ella y escribir un desenlace dependiendo del resultado de la tirada de dados.

En el epilogo, el jugador descrubre un último libro en el que se escribirá el recuerdo de la situación a la que se enfrenta en el presente. Debe combinar distintas tiradas para ir consiguiendo puntos de superación y hacer una ultima tirada que decidirá su destino.

Además de esta información en la portada tiene que haber un enlace al PDF en el que se explica el juego para poder jugarse con lapiz y papel. El documento ahora mismo esta en la carpeta docs, pero se debe copiar al front para poder servirlo

# Despelgar a produccion y analisis de performance

Analizar si el proyecto esta preparado para desplegarse en produccion

Analiza como se podria mejorar la performance de juego, el front suele estar esperando mucho a las respuestas de la API

Es correcto mantener la estructura docker o se puede hacer que cada proyecto tenga su despliegue independiente?

Revisa tambien todo lo relacionado con la seguridad

Las contraseñas viajan de manera segura? funciona https? hay vulnerabilidades?

Cuales son las mejores plataformas online para desplegar el proyecto gratis o a bajo coste