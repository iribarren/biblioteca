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